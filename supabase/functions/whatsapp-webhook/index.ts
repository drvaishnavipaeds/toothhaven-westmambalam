import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM = `You are Haven AI, the bilingual (English/Tamil) WhatsApp assistant for Tooth Haven Advanced Dental Care, West Mambalam, Chennai.
Dr. Karthik Srinivasan (BDS) leads the clinic. Hours: Mon-Sat 11am-2pm and 6pm-9pm; Sunday by prior appointment. Phone: +91 89251 66149.
Services: general dentistry, implants, root canal, orthodontics, cosmetic dentistry, CBCT imaging, paediatric dentistry, oral surgery, crowns & bridges, digital smile design, and home visits.
Rules:
- Reply in the same language the patient wrote in (Tamil script if they wrote Tamil).
- Keep replies under 4 short lines; this is WhatsApp.
- Never diagnose or prescribe. For pain/swelling/trauma, ask them to call +91 89251 66149 right away.
- To book, collect name, preferred date and service, and confirm the clinic will reach out.
- If the question needs a human (fees for a complex case, records, complaints), say a team member will reply shortly.`;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sendWhatsApp(to: string, body: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) throw new Error("WhatsApp credentials missing");
  const r = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  const out = await r.json();
  if (!r.ok) throw new Error(out?.error?.message ?? "WhatsApp send failed");
  return out?.messages?.[0]?.id as string | undefined;
}

async function aiReply(phone: string, message: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  const { data: history } = await admin
    .from("whatsapp_messages")
    .select("direction, body")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(10);

  const messages = [
    { role: "system", content: SYSTEM },
    ...(history ?? []).reverse().filter((m) => m.body).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body as string,
    })),
    { role: "user", content: message },
  ];

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!r.ok) {
    console.error("AI gateway error", r.status, await r.text());
    return null;
  }
  const data = await r.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

async function handleInbound(value: Record<string, any>) {
  const contact = value?.contacts?.[0];
  const profileName = contact?.profile?.name ?? null;

  for (const msg of value?.messages ?? []) {
    const phone: string = msg.from;
    const type: string = msg.type ?? "text";
    const body: string | null = type === "text"
      ? msg.text?.body ?? null
      : msg.button?.text ?? msg.interactive?.list_reply?.title ?? msg.interactive?.button_reply?.title ?? null;

    const digits = phone.replace(/\D/g, "").slice(-10);
    const { data: patient } = await admin
      .from("patients").select("id").ilike("phone", `%${digits}`).maybeSingle();

    const { data: inserted, error } = await admin.from("whatsapp_messages").insert({
      wa_message_id: msg.id,
      direction: "inbound",
      phone,
      profile_name: profileName,
      body,
      message_type: type,
      patient_id: patient?.id ?? null,
      raw: msg,
    }).select("id").maybeSingle();

    if (error) {
      // Duplicate delivery from Meta — already processed.
      console.log("Skipping duplicate/failed insert:", error.message);
      continue;
    }

    // If a staff member took over this conversation in the last 2 hours, stay silent.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count: takeover } = await admin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("handled_by_staff", true)
      .gte("created_at", twoHoursAgo);
    if ((takeover ?? 0) > 0) continue;

    if (!body) continue;

    const reply = await aiReply(phone, body);
    if (!reply) continue;

    try {
      const outId = await sendWhatsApp(phone, reply);
      await admin.from("whatsapp_messages").insert({
        wa_message_id: outId ?? null,
        direction: "outbound",
        phone,
        body: reply,
        message_type: "text",
        ai_replied: true,
        patient_id: patient?.id ?? null,
      });
      if (inserted?.id) {
        await admin.from("whatsapp_messages").update({ ai_replied: true }).eq("id", inserted.id);
      }
    } catch (e) {
      console.error("Auto-reply send failed:", e);
    }
  }

  for (const st of value?.statuses ?? []) {
    await admin.from("whatsapp_messages")
      .update({ status: st.status })
      .eq("wa_message_id", st.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode !== "subscribe") return new Response("Invalid mode", { status: 400, headers: corsHeaders });
    if (!VERIFY_TOKEN) return new Response("Webhook not configured", { status: 500, headers: corsHeaders });
    if (token !== VERIFY_TOKEN) return new Response("Forbidden", { status: 403, headers: corsHeaders });
    if (!challenge) return new Response("Missing challenge", { status: 400, headers: corsHeaders });
    return new Response(challenge, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const values = (body?.entry ?? []).flatMap((e: any) => (e?.changes ?? []).map((c: any) => c?.value)).filter(Boolean);
      // Meta requires a 200 within 20s — process in the background.
      const work = (async () => {
        for (const v of values) {
          try { await handleInbound(v); } catch (e) { console.error("handleInbound failed:", e); }
        }
      })();
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work); else await work;
    } catch (e) {
      console.error("Webhook parse error:", e);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
