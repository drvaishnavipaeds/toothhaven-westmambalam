import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe") {
      return new Response("Invalid mode", { status: 400, headers: corsHeaders });
    }

    if (!VERIFY_TOKEN) {
      console.error("META_WEBHOOK_VERIFY_TOKEN is not configured");
      return new Response("Webhook not configured", { status: 500, headers: corsHeaders });
    }

    if (token !== VERIFY_TOKEN) {
      console.warn("Webhook verify token mismatch");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    if (!challenge) {
      return new Response("Missing challenge", { status: 400, headers: corsHeaders });
    }

    return new Response(challenge, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("WhatsApp webhook event:", JSON.stringify(body, null, 2));

      // Meta requires a 200 OK response within 20 seconds. Acknowledge quickly.
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Webhook parse error:", e);
      // Still acknowledge so Meta does not retry indefinitely.
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
