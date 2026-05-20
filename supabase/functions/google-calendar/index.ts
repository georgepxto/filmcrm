import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // ── EXCHANGE CODE ──────────────────────────────────────────────────────────
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
        // Save refresh_token — surface any DB error (table might not exist)
        const { error: upsertError } = await supabaseAdmin.from("google_tokens").upsert({
          user_id: user.id,
          refresh_token,
          updated_at: new Date().toISOString(),
        });

        if (upsertError) {
          throw new Error(`DB error saving refresh_token: ${upsertError.message}. Make sure the google_tokens table exists (run migration_google_oauth.sql).`);
        }

        console.log(`[google-calendar] Saved refresh_token for user ${user.id}`);
      } else {
        // No refresh_token from Google — check if we already have one stored
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

        console.log(`[google-calendar] Reusing existing refresh_token for user ${user.id}`);
      }

      return new Response(
        JSON.stringify({ access_token, expires_in }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET TOKEN (silent refresh) ─────────────────────────────────────────────
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

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: savedToken.refresh_token,
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

    // ── REVOKE (sign out) ──────────────────────────────────────────────────────
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
