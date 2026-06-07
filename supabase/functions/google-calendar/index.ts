import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = ["https://filmmakercrm.vercel.app", "http://localhost:5173", "http://localhost"];

// ── Rate limit config per action ──────────────────────────────────────────────
const RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  exchange_code: { maxRequests: 5,  windowSeconds: 3600  }, // 5x per hour
  get_token:     { maxRequests: 60, windowSeconds: 3600  }, // 60x per hour (multi-device)
  revoke:        { maxRequests: 10, windowSeconds: 3600  }, // 10x per hour
  _global:       { maxRequests: 120, windowSeconds: 3600 }, // 120x per hour total (any action)
};

// ── Rate limiter (sliding window) ─────────────────────────────────────────────
async function checkRateLimit(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  userId: string,
  ip: string,
  action: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();

  // Check both user-based and action-specific limits
  const checks = [
    { identifier: `user:${userId}:${action}`, ...RATE_LIMITS[action] },
    { identifier: `user:${userId}:_global`,   ...RATE_LIMITS._global  },
    { identifier: `ip:${ip}:${action}`,       ...RATE_LIMITS[action]  },
  ];

  for (const check of checks) {
    const windowStart = new Date(now - check.windowSeconds * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from("rate_limit_logs")
      .select("*", { count: "exact", head: true })
      .eq("identifier", check.identifier)
      .gte("created_at", windowStart);

    if (error) {
      // If rate limit table doesn't exist yet, fail open (don't block)
      console.warn("[rate-limit] Table error, failing open:", error.message);
      return { allowed: true };
    }

    if ((count ?? 0) >= check.maxRequests) {
      console.warn(`[rate-limit] BLOCKED: ${check.identifier} hit ${count}/${check.maxRequests} in ${check.windowSeconds}s`);
      return { allowed: false, retryAfterSeconds: check.windowSeconds };
    }
  }

  // Log this request for all identifiers
  const inserts = checks.map((c) => ({ identifier: c.identifier, action }));
  await supabaseAdmin.from("rate_limit_logs").insert(inserts);

  // Lazy cleanup: delete records older than 2 hours (keeps table small, runs ~1% of requests)
  if (Math.random() < 0.01) {
    const cutoff = new Date(now - 7200 * 1000).toISOString();
    supabaseAdmin.from("rate_limit_logs").delete().lt("created_at", cutoff).then(() => {});
  }

  return { allowed: true };
}

// ── Crypto helpers (AES-256-GCM) ─────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-char hex string. Add it to Edge Function secrets.");
  }
  return await crypto.subtle.importKey("raw", hexToBytes(keyHex), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(ciphertext))}`;
}

async function decryptToken(stored: string): Promise<string> {
  if (!stored.includes(":")) {
    console.warn("[google-calendar] Legacy plaintext token detected — will be re-encrypted.");
    return stored;
  }
  const [ivHex, ciphertextHex] = stored.split(":");
  const key = await getEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(ivHex) },
    key,
    hexToBytes(ciphertextHex)
  );
  return new TextDecoder().decode(plaintext);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, code } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit check (after auth, using real user ID) ─────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const { allowed, retryAfterSeconds } = await checkRateLimit(supabaseAdmin, user.id, ip, action);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds ?? 3600),
            "X-RateLimit-Limit": String(RATE_LIMITS[action]?.maxRequests ?? 0),
          },
        }
      );
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || "postmessage";

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials in environment variables.");
    }

    // ── EXCHANGE CODE ─────────────────────────────────────────────────────────
    if (action === "exchange_code") {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        throw new Error(`Google OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const { access_token, refresh_token, expires_in } = tokenData;

      if (refresh_token) {
        const encryptedToken = await encryptToken(refresh_token);
        const { error: upsertError } = await supabaseAdmin.from("google_tokens").upsert({
          user_id: user.id,
          refresh_token: encryptedToken,
          updated_at: new Date().toISOString(),
        });
        if (upsertError) {
          throw new Error(`DB error saving refresh_token: ${upsertError.message}`);
        }
        console.log(`[google-calendar] Saved encrypted refresh_token for user ${user.id}`);
      } else {
        const { data: existing, error: selectError } = await supabaseAdmin
          .from("google_tokens").select("refresh_token").eq("user_id", user.id).single();
        if (selectError || !existing?.refresh_token) {
          throw new Error("Google did not return a refresh_token and none is stored. Reconnect to generate a new one.");
        }
      }

      return new Response(
        JSON.stringify({ access_token, expires_in }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET TOKEN (silent refresh) ────────────────────────────────────────────
    if (action === "get_token") {
      const { data: savedToken, error: selectError } = await supabaseAdmin
        .from("google_tokens").select("refresh_token").eq("user_id", user.id).single();

      if (selectError || !savedToken?.refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token found. User must reconnect." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const plainRefreshToken = await decryptToken(savedToken.refresh_token);

      // Lazy migration: re-encrypt legacy plaintext tokens
      if (!savedToken.refresh_token.includes(":")) {
        const encryptedToken = await encryptToken(plainRefreshToken);
        await supabaseAdmin.from("google_tokens").update({
          refresh_token: encryptedToken, updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        console.log(`[google-calendar] Migrated legacy token to encrypted for user ${user.id}`);
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId, client_secret: clientSecret,
          refresh_token: plainRefreshToken, grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();
      if (refreshData.error) {
        console.error(`[google-calendar] Refresh rejected for user ${user.id}: ${refreshData.error}`);
        await supabaseAdmin.from("google_tokens").delete().eq("user_id", user.id);
        return new Response(JSON.stringify({ error: "Refresh token revoked. User must reconnect." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ access_token: refreshData.access_token, expires_in: refreshData.expires_in }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REVOKE (sign out) ─────────────────────────────────────────────────────
    if (action === "revoke") {
      await supabaseAdmin.from("google_tokens").delete().eq("user_id", user.id);
      console.log(`[google-calendar] Deleted token for user ${user.id}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Invalid action: ${action}`);

  } catch (err) {
    console.error("[google-calendar] Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
