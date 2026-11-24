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

    if (body.action === "transcribe") {
      const videoUrl = String(body.video_url ?? "");
      const base = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/clinic-media/`;
      if (!videoUrl.startsWith(base)) return json({ error: "Only videos uploaded to the clinic library can be transcribed." }, 400);
      const key = Deno.env.get("ELEVENLABS_API_KEY");
      if (!key) return json({ error: "Voice service is not connected." }, 500);
      const vid = await fetch(videoUrl);
      if (!vid.ok) return json({ error: "Could not read the video file." }, 400);
      const blob = await vid.blob();
      if (blob.size > 200 * 1024 * 1024) return json({ error: "Video is too large to transcribe (max 200 MB)." }, 400);
      const fd = new FormData();
      fd.append("file", blob, "video.mp4");
      fd.append("model_id", "scribe_v2");
      fd.append("language_code", "eng");
      fd.append("tag_audio_events", "false");
      const stt = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd });
      if (!stt.ok) {
        const t = await stt.text();
        console.error("stt failed", stt.status, t);
        return json({ error: "Transcription failed", status: stt.status, details: t }, stt.status);
      }
      const transcript = String((await stt.json()).text ?? "").trim();
      if (!transcript) return json({ error: "No speech was found in this video." }, 422);
      try {
        const r: any = await generateResponse({
          model: "openai/gpt-6-astra",
          instructions: "You receive the raw English speech transcript of a dental patient-education video. Return ONLY JSON {\"captions\":\"\",\"description\":\"\"}. captions: the transcript cleaned up (fix punctuation, remove filler words, keep meaning and wording) split into short subtitle lines separated by newlines. description: a friendly 2-3 sentence patient summary of the video. Do not invent clinical claims.",
          input: transcript.slice(0, 12000),
        });
        const text = (r.output ?? []).flatMap((o: any) => o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text).join("");
        const out = JSON.parse(text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
        return json({ captions: out.captions || transcript, description: out.description || "", transcript });
      } catch (e) {
        console.error("format failed", e);
        return json({ captions: transcript, description: "", transcript });
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
