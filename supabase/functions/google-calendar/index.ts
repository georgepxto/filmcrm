import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Crypto helpers (AES-256-GCM via Web Crypto API) ──────────────────────────

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
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Add it to Edge Function secrets.");
  }
  return await crypto.subtle.importKey(
    "raw",
    hexToBytes(keyHex),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string.
 * Returns a string in format: `<iv_hex>:<ciphertext_hex>`
 */
async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV — standard for AES-GCM
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(ciphertext))}`;
}

/**
 * Decrypts a string encrypted by encryptToken.
 * Also handles legacy unencrypted tokens (no ":" separator) for backward compatibility.
 */
async function decryptToken(stored: string): Promise<string> {
  // Legacy: token was stored as plain text before encryption was added
  if (!stored.includes(":")) {
    console.warn("[google-calendar] Warning: decrypting a legacy plaintext token. Will be re-encrypted on next save.");
    return stored;
  }
  const [ivHex, ciphertextHex] = stored.split(":");
  const key = await getEncryptionKey();
  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, code } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Admin client bypasses RLS — required to read/write google_tokens
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token", details: String(userError) }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        // Encrypt before saving to DB
        const encryptedToken = await encryptToken(refresh_token);

        const { error: upsertError } = await supabaseAdmin.from("google_tokens").upsert({
          user_id: user.id,
          refresh_token: encryptedToken,
          updated_at: new Date().toISOString(),
        });

        if (upsertError) {
          throw new Error(`DB error saving refresh_token: ${upsertError.message}. Make sure the google_tokens table exists.`);
        }

        console.log(`[google-calendar] Saved encrypted refresh_token for user ${user.id}`);
      } else {
        // No new token — check if we have a valid one stored
        const { data: existing, error: selectError } = await supabaseAdmin
          .from("google_tokens")
          .select("refresh_token")
          .eq("user_id", user.id)
          .single();

        if (selectError || !existing?.refresh_token) {
          throw new Error(
            "Google did not return a refresh_token and none is stored in DB. " +
            "Disconnect and reconnect to force a new consent screen."
          );
        }

        console.log(`[google-calendar] Reusing existing encrypted refresh_token for user ${user.id}`);
      }

      return new Response(
        JSON.stringify({ access_token, expires_in }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET TOKEN (silent refresh) ────────────────────────────────────────────
    if (action === "get_token") {
      const { data: savedToken, error: selectError } = await supabaseAdmin
        .from("google_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .single();

      if (selectError || !savedToken?.refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token found. User must reconnect." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decrypt before using
      const plainRefreshToken = await decryptToken(savedToken.refresh_token);

      // If it was a legacy plaintext token, re-encrypt and save it now
      if (!savedToken.refresh_token.includes(":")) {
        const encryptedToken = await encryptToken(plainRefreshToken);
        await supabaseAdmin.from("google_tokens").update({
          refresh_token: encryptedToken,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        console.log(`[google-calendar] Migrated legacy plaintext token to encrypted for user ${user.id}`);
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: plainRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();

      if (refreshData.error) {
        console.error(`[google-calendar] Refresh rejected for user ${user.id}: ${refreshData.error}`);
        await supabaseAdmin.from("google_tokens").delete().eq("user_id", user.id);
        return new Response(JSON.stringify({ error: "Refresh token revoked. User must reconnect." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
