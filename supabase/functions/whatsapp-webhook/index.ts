import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { last10, logMessage, sendText, toE164 } from "../_shared/whatsapp.ts";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM = `You are Haven AI, the bilingual (English/Tamil) WhatsApp assistant for Tooth Haven Advanced Dental Care, West Mambalam, Chennai.
Dr. Karthik Srinivasan (BDS) leads the clinic. Hours: Mon-Sat 11am-2pm and 6pm-9pm; Sunday by prior appointment. Phone: +91 89251 66149.
Services: general dentistry, implants, root canal, orthodontics, cosmetic dentistry, CBCT imaging, paediatric dentistry, oral surgery, crowns & bridges, digital smile design, and home visits.
Rules:
- Reply in the same language the patient wrote in (Tamil script if they wrote Tamil).
- Keep replies under 4 short lines; this is WhatsApp.
- Never diagnose or prescribe. For pain/swelling/trauma, ask them to call +91 89251 66149 right away.
- Use book_appointment only when you have the patient's name, a preferred date (YYYY-MM-DD) and the service. Ask for whatever is missing first.
- Use request_human whenever the patient asks for a person, complains, disputes a bill, or you are unsure.
- Patients can stop promotional messages any time by replying STOP.`;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TOOLS = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Create a pending appointment request for this patient.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          appointment_date: { type: "string", description: "YYYY-MM-DD" },
          treatment_type: { type: "string" },
          notes: { type: "string" },
        },
        required: ["name", "appointment_date", "treatment_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_human",
      description: "Flag this conversation for a clinic team member to answer.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
    },
  },
];

/** Short summary of this patient's own record, so the bot can answer "when is my next visit". */
async function patientContext(phone: string): Promise<string> {
  const digits = last10(phone);
  const { data: patient } = await admin
    .from("patients").select("id, name").ilike("phone", `%${digits}`).maybeSingle();
  if (!patient) return "This number is not registered as a patient yet.";

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: upcoming }, { data: plans }] = await Promise.all([
    admin.from("appointments")
      .select("appointment_date, appointment_time, treatment_type, status")
      .eq("patient_id", patient.id).gte("appointment_date", today)
      .order("appointment_date", { ascending: true }).limit(3),
    admin.from("treatment_plans")
      .select("title, status").eq("patient_id", patient.id)
      .order("created_at", { ascending: false }).limit(3),
  ]);

  const lines = [`Registered patient: ${patient.name}.`];
  if (upcoming?.length) {
    lines.push(
      "Upcoming appointments: " +
        upcoming.map((a) => `${a.appointment_date} ${a.appointment_time ?? ""} (${a.treatment_type ?? "consultation"}, ${a.status})`).join("; "),
    );
  } else {
    lines.push("No upcoming appointments on record.");
  }
  if (plans?.length) {
    lines.push("Treatment plans: " + plans.map((p) => `${p.title} (${p.status})`).join("; "));
  }
  return lines.join("\n");
}

async function bookAppointment(phone: string, args: Record<string, string>) {
  const digits = last10(phone);
  const { data: patient } = await admin.from("patients").select("id, name").ilike("phone", `%${digits}`).maybeSingle();
  const { data, error } = await admin.from("appointments").insert({
    patient_id: patient?.id ?? null,
    patient_name: String(args.name ?? patient?.name ?? "WhatsApp patient").slice(0, 100),
    patient_phone: digits,
    appointment_date: args.appointment_date,
    appointment_time: "To be confirmed",
    treatment_type: String(args.treatment_type ?? "Consultation").slice(0, 100),
    notes: `Requested via WhatsApp (Haven AI). ${String(args.notes ?? "").slice(0, 300)}`.trim(),
    status: "pending",
    source: "whatsapp",
  }).select("id").maybeSingle();
  if (error) {
    console.error("WhatsApp booking failed:", error.message);
    return { ok: false, message: "Could not save the request." };
  }
  return { ok: true, id: data?.id, message: "Appointment request saved; the clinic will confirm the time." };
}

async function callModel(messages: unknown[]) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": LOVABLE_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, tools: TOOLS }),
  });
  if (!r.ok) {
    console.error("AI gateway error", r.status, await r.text());
    return null;
  }
  return await r.json();
}

async function aiReply(phone: string, message: string): Promise<{ text: string | null; escalate: boolean }> {
  if (!LOVABLE_API_KEY) return { text: null, escalate: false };

  const { data: history } = await admin
    .from("whatsapp_messages")
    .select("direction, body")
    .eq("phone", toE164(phone))
    .order("created_at", { ascending: false })
    .limit(10);

  const messages: any[] = [
    { role: "system", content: SYSTEM },
    { role: "system", content: await patientContext(phone) },
    ...(history ?? []).reverse().filter((m) => m.body).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body as string,
    })),
    { role: "user", content: message },
  ];

  let escalate = false;
  for (let round = 0; round < 3; round++) {
    const data = await callModel(messages);
    const choice = data?.choices?.[0]?.message;
    if (!choice) return { text: null, escalate };

    const calls = choice.tool_calls ?? [];
    if (!calls.length) return { text: choice.content ?? null, escalate };

    messages.push(choice);
    for (const call of calls) {
      const name = call.function?.name;
      let args: Record<string, string> = {};
      try { args = JSON.parse(call.function?.arguments ?? "{}"); } catch { /* ignore */ }

      let result: unknown;
      if (name === "book_appointment") {
        result = await bookAppointment(phone, args);
      } else if (name === "request_human") {
        escalate = true;
        result = { ok: true, message: "A team member has been notified and will reply shortly." };
      } else {
        result = { ok: false, message: "Unknown tool" };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return { text: null, escalate };
}

const STOP_WORDS = ["stop", "unsubscribe", "வேண்டாம்"];
const START_WORDS = ["start", "subscribe"];

async function handleOptOut(phone: string, body: string): Promise<string | null> {
  const text = body.trim().toLowerCase();
  const digits = last10(phone);
  if (STOP_WORDS.includes(text)) {
    await admin.from("patients").update({ whatsapp_opt_out: true }).ilike("phone", `%${digits}`);
    return "You will no longer receive promotional messages from Tooth Haven. Appointment and billing updates will still reach you. Reply START to resume offers.";
  }
  if (START_WORDS.includes(text)) {
    await admin.from("patients").update({ whatsapp_opt_out: false }).ilike("phone", `%${digits}`);
    return "You are subscribed again for Tooth Haven offers and reminders.";
  }
  return null;
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

    const digits = last10(phone);
    const { data: patient } = await admin
      .from("patients").select("id").ilike("phone", `%${digits}`).maybeSingle();

    const { data: inserted, error } = await admin.from("whatsapp_messages").insert({
      wa_message_id: msg.id,
      direction: "inbound",
      phone: toE164(phone),
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

    if (!body) continue;

    // STOP / START always wins, even when staff have taken over.
    const optOutReply = await handleOptOut(phone, body);
    if (optOutReply) {
      const res = await sendText(phone, optOutReply);
      await logMessage(admin, {
        wa_message_id: res.id ?? null,
        direction: "outbound",
        phone,
        body: optOutReply,
        ai_replied: true,
        patient_id: patient?.id ?? null,
      });
      continue;
    }

    // If a staff member took over this conversation in the last 2 hours, stay silent.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count: takeover } = await admin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("phone", toE164(phone))
      .eq("handled_by_staff", true)
      .gte("created_at", twoHoursAgo);
    if ((takeover ?? 0) > 0) continue;

    const { text: reply, escalate } = await aiReply(phone, body);

    if (escalate) {
      await admin.from("whatsapp_messages")
        .update({ handled_by_staff: false, status: "needs_staff" })
        .eq("id", inserted?.id ?? "");
    }
    if (!reply) continue;

    try {
      const res = await sendText(phone, reply);
      if (!res.ok) throw new Error(res.error ?? "send failed");
      await logMessage(admin, {
        wa_message_id: res.id ?? null,
        direction: "outbound",
        phone,
        body: reply,
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
    await admin.from("campaign_recipients")
      .update({ status: st.status === "failed" ? "failed" : st.status })
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
