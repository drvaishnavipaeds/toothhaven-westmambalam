import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateResponse, GatewayError } from "npm:@lovable.dev/ai-gateway";

// Staff-only: translate video text to Tamil (Lovable AI) or generate a Tamil voice-over (ElevenLabs).
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not authenticated" }, 401);
    const { data: staff } = await userClient.rpc("is_staff");
    if (staff !== true) return json({ error: "Not authorized" }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === "translate") {
      const fields = {
        title: String(body.title ?? "").slice(0, 300),
        description: String(body.description ?? "").slice(0, 3000),
        captions: String(body.captions ?? "").slice(0, 8000),
      };
      try {
        const r: any = await generateResponse({
          model: "openai/gpt-6-astra",
          instructions: "You translate dental patient-education text from English to natural, simple spoken-style Tamil script for patients in Chennai. Keep medical terms understandable (add the English term in brackets when helpful). Keep line breaks. Return ONLY JSON: {\"title\":\"\",\"description\":\"\",\"captions\":\"\"}. Empty input fields stay empty.",
          input: JSON.stringify(fields),
        });
        const text = (r.output ?? []).flatMap((o: any) => o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text).join("");
        const raw = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        const out = JSON.parse(raw);
        return json({ title: out.title ?? "", description: out.description ?? "", captions: out.captions ?? "" });
      } catch (e: any) {
        const s = e instanceof GatewayError ? e.httpStatus : undefined;
        if (s === 429) return json({ error: "AI is busy right now. Try again in a moment." }, 429);
        if (s === 402) return json({ error: "AI credits are exhausted." }, 402);
        console.error("translate failed", e);
        return json({ error: "Translation failed. Please try again." }, 500);
      }
    }

    if (body.action === "voice") {
      const text = String(body.text ?? "").trim().slice(0, 4500);
      if (!text) return json({ error: "Add Tamil captions or description first." }, 400);
      const key = Deno.env.get("ELEVENLABS_API_KEY");
      if (!key) return json({ error: "Voice service is not connected." }, 500);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text, model_id: "eleven_multilingual_v2", language_code: "ta",
          voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.95 },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("tts failed", res.status, t);
        return json({ error: "Voice generation failed", status: res.status, details: t }, res.status);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const path = `clinic-videos/audio/${crypto.randomUUID()}.mp3`;
      const { error } = await userClient.storage.from("clinic-media").upload(path, buf, { contentType: "audio/mpeg" });
      if (error) return json({ error: error.message }, 500);
      const { data } = userClient.storage.from("clinic-media").getPublicUrl(path);
      return json({ url: data.publicUrl });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected error" }, 500);
  }
});
