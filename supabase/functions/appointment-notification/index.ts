import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  DEFAULT_LANG,
  TEMPLATES,
  createMessageTemplate,
  listApprovedTemplates,
  logMessage,
  sendTemplate,
  toE164,
  type WaTemplate,
} from "../_shared/whatsapp.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const eventSchema = z.object({
  appointmentId: z.string().uuid(),
  event: z.enum(["request", "confirmation", "rescheduled", "cancelled", "reminder"]).default("request"),
  reason: z.string().trim().max(300).optional(),
  previousDate: z.string().max(20).optional(),
  previousTime: z.string().max(40).optional(),
});

type EventName = z.infer<typeof eventSchema>["event"];
type Appointment = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  treatment_type: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
};

const EVENT_CONFIG: Record<EventName, { template: string; names: string[] }> = {
  request: {
    template: TEMPLATES.appointmentRequest,
    names: ["name", "date", "time", "service"],
  },
  confirmation: {
    template: TEMPLATES.appointmentConfirmation,
    names: ["name", "date", "time", "service"],
  },
  rescheduled: {
    template: TEMPLATES.appointmentRescheduled,
    names: ["name", "old_date", "old_time", "new_date", "new_time", "service"],
  },
  cancelled: {
    template: TEMPLATES.appointmentCancelled,
    names: ["name", "date", "time", "reason"],
  },
  reminder: {
    template: TEMPLATES.appointmentReminder,
    names: ["name", "date", "time"],
  },
};

const TEMPLATE_DEFINITIONS = [
  { name: TEMPLATES.appointmentRequest, category: "UTILITY" as const, language: DEFAULT_LANG, body: "Hi {{1}}, we received your appointment request for {{4}} on {{2}} at {{3}}. Tooth Haven will confirm it shortly.", examples: ["Karthik", "15 September 2026", "11:00 AM", "Dental consultation"] },
  { name: TEMPLATES.appointmentConfirmation, category: "UTILITY" as const, language: DEFAULT_LANG, body: "Hi {{1}}, your Tooth Haven appointment for {{4}} is confirmed for {{2}} at {{3}}. Reply here if you need help.", examples: ["Karthik", "15 September 2026", "11:00 AM", "Dental consultation"] },
  { name: TEMPLATES.appointmentRescheduled, category: "UTILITY" as const, language: DEFAULT_LANG, body: "Hi {{1}}, your {{6}} appointment has moved from {{2}} at {{3}} to {{4}} at {{5}}. Reply here if you need help.", examples: ["Karthik", "15 September 2026", "11:00 AM", "16 September 2026", "3:00 PM", "Dental consultation"] },
  { name: TEMPLATES.appointmentCancelled, category: "UTILITY" as const, language: DEFAULT_LANG, body: "Hi {{1}}, your Tooth Haven appointment on {{2}} at {{3}} was cancelled. Reason: {{4}}. Reply here to arrange another time.", examples: ["Karthik", "15 September 2026", "11:00 AM", "Requested by patient"] },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

function jwtRole(req: Request): string | null {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalised = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(atob(normalised.padEnd(Math.ceil(normalised.length / 4) * 4, "=")));
    return typeof decoded?.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

async function isStaff(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await admin.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (!email) return false;
  const { data: staff } = await admin.from("admin_phones").select("id").ilike("email", email).maybeSingle();
  return Boolean(staff);
}

function bodyParams(
  template: WaTemplate,
  configuredNames: string[],
  configuredValues: string[],
): { names?: string[]; values: string[] } {
  const body = Array.isArray(template.components)
    ? template.components.find((component: any) => component?.type === "BODY") as any
    : undefined;
  const examples = body?.example?.body_text_named_params;
  if (Array.isArray(examples) && examples.length > 0) {
    const names = examples
      .map((example: any) => typeof example?.param_name === "string" ? example.param_name : null)
      .filter((name: string | null): name is string => Boolean(name));
    if (names.length > 0) {
      return {
        names,
        values: names.map((name, index) => {
          const configuredIndex = configuredNames.indexOf(name);
          return configuredIndex >= 0 ? configuredValues[configuredIndex] : configuredValues[index] ?? "";
        }),
      };
    }
  }

  const text = typeof body?.text === "string" ? body.text : "";
  const positionalCount = new Set(
    Array.from(text.matchAll(/\{\{(\d+)\}\}/g), (match) => match[1]),
  ).size;
  return {
    values: positionalCount > 0 ? configuredValues.slice(0, positionalCount) : configuredValues,
  };
}

function templateParameters(template: WaTemplate) {
  const body = Array.isArray(template.components)
    ? template.components.find((component: any) => component?.type === "BODY") as any
    : undefined;
  const named = Array.isArray(body?.example?.body_text_named_params)
    ? body.example.body_text_named_params
      .map((item: any) => typeof item?.param_name === "string" ? item.param_name : null)
      .filter((name: string | null): name is string => Boolean(name))
    : [];
  const positional = typeof body?.text === "string"
    ? new Set(Array.from(body.text.matchAll(/\{\{(\d+)\}\}/g), (match: RegExpMatchArray) => match[1])).size
    : 0;
  return { named, count: named.length || positional };
}

function valuesFor(appt: Appointment, event: EventName, input: z.infer<typeof eventSchema>): string[] {
  const common = [
    clean(appt.patient_name, 80),
    clean(appt.appointment_date, 20),
    clean(appt.appointment_time || "To be confirmed", 40),
    clean(appt.treatment_type || "Dental consultation", 100),
  ];
  if (event === "request" || event === "confirmation") return common;
  if (event === "reminder") return common.slice(0, 3);
  if (event === "cancelled") return [...common.slice(0, 3), clean(input.reason || "Cancelled by the clinic", 300)];
  return [
    common[0],
    clean(input.previousDate || appt.appointment_date, 20),
    clean(input.previousTime || appt.appointment_time, 40),
    common[1],
    common[2],
    common[3],
  ];
}

function eventKey(appt: Appointment, event: EventName, input: z.infer<typeof eventSchema>): string {
  if (event === "rescheduled") return `rescheduled:${input.previousDate ?? ""}:${input.previousTime ?? ""}:${appt.appointment_date}:${appt.appointment_time}`;
  if (event === "reminder") return `reminder:${appt.appointment_date}:${appt.appointment_time}:24h`;
  return event;
}

async function sendEvent(appt: Appointment, event: EventName, input: z.infer<typeof eventSchema>) {
  const config = EVENT_CONFIG[event];
  const key = eventKey(appt, event, input);
  const phone = toE164(appt.patient_phone);
  const { data: existing } = await admin
    .from("appointment_notifications")
    .select("id,status,wa_message_id")
    .eq("appointment_id", appt.id)
    .eq("event_key", key)
    .maybeSingle();
  if (existing && existing.status !== "failed") {
    return { ok: true, duplicate: true, status: existing.status, messageId: existing.wa_message_id };
  }

  const templates = await listApprovedTemplates();
  const template = templates.find((item) => item.name === config.template && item.language === DEFAULT_LANG)
    ?? templates.find((item) => item.name === config.template);
  if (!template) {
    const error = `Meta template ${config.template} is not approved.`;
    await admin.from("appointment_notifications").upsert({
      appointment_id: appt.id,
      event_type: event,
      event_key: key,
      template_name: config.template,
      template_language: DEFAULT_LANG,
      phone,
      status: "failed",
      error,
      failed_at: new Date().toISOString(),
      metadata: input,
    }, { onConflict: "appointment_id,event_key" });
    return { ok: false, configurationRequired: true, error };
  }

  await admin.from("appointment_notifications").upsert({
    appointment_id: appt.id,
    event_type: event,
    event_key: key,
    template_name: template.name,
    template_language: template.language,
    phone,
    status: "sending",
    error: null,
    metadata: input,
  }, { onConflict: "appointment_id,event_key" });

  const configuredValues = valuesFor(appt, event, input);
  const params = bodyParams(template, config.names, configuredValues);
  const result = await sendTemplate({
    to: phone,
    name: template.name,
    language: template.language,
    bodyParams: params.values,
    bodyParamNames: params.names,
  });
  const now = new Date().toISOString();
  await admin.from("appointment_notifications").update(result.ok ? {
    status: "sent",
    wa_message_id: result.id ?? null,
    sent_at: now,
    failed_at: null,
    error: null,
  } : {
    status: "failed",
    error: result.error ?? "WhatsApp send failed",
    failed_at: now,
  }).eq("appointment_id", appt.id).eq("event_key", key);

  if (result.ok) {
    await logMessage(admin, {
      wa_message_id: result.id ?? null,
      direction: "outbound",
      phone,
      body: `[template] ${template.name} — ${params.values.join(" | ")}`,
      message_type: "template",
      template_name: template.name,
      patient_id: appt.patient_id,
    });
  }
  return { ...result, template: template.name };
}

async function scanReminders() {
  const now = new Date();
  const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dates = Array.from(new Set([
    now.toISOString().slice(0, 10),
    target.toISOString().slice(0, 10),
    new Date(target.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  ]));
  const { data: appointments, error } = await admin
    .from("appointments")
    .select("id,patient_id,patient_name,patient_phone,appointment_date,appointment_time,treatment_type,status,source,created_at,updated_at")
    .eq("status", "confirmed")
    .in("appointment_date", dates);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const appt of (appointments ?? []) as Appointment[]) {
    const scheduled = new Date(`${appt.appointment_date}T${/^\d{2}:\d{2}/.test(appt.appointment_time) ? appt.appointment_time.slice(0, 5) : "11:00"}:00+05:30`);
    const hours = (scheduled.getTime() - now.getTime()) / 3_600_000;
    if (hours < 23.5 || hours > 24.5) continue;
    const result = await sendEvent(appt, "reminder", { appointmentId: appt.id, event: "reminder" });
    if (result.ok && !result.duplicate) sent += 1;
    if (!result.ok) failed += 1;
  }
  return { ok: true, checked: appointments?.length ?? 0, sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const raw = await req.json().catch(() => ({}));
    if (raw?.action === "setup_templates") {
      if (jwtRole(req) !== "service_role" && !await isStaff(req)) return json({ error: "Forbidden" }, 403);
      const existing = await listApprovedTemplates(true);
      const existingByName = new Map(existing.map((template) => [template.name, template]));
      const results = [];
      for (const definition of TEMPLATE_DEFINITIONS) {
        const existingTemplate = existingByName.get(definition.name);
        if (existingTemplate) {
          results.push({
            name: definition.name,
            ok: true,
            existing: true,
            parameters: templateParameters(existingTemplate),
          });
          continue;
        }
        results.push({ name: definition.name, ...await createMessageTemplate(definition) });
      }
      return json({ ok: results.every((result) => result.ok), results });
    }
    if (raw?.action === "scan_reminders") {
      if (jwtRole(req) !== "service_role") return json({ error: "Forbidden" }, 403);
      return json(await scanReminders());
    }

    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;
    const { data: appt, error } = await admin
      .from("appointments")
      .select("id,patient_id,patient_name,patient_phone,appointment_date,appointment_time,treatment_type,status,source,created_at,updated_at")
      .eq("id", input.appointmentId)
      .maybeSingle();
    if (error || !appt) return json({ error: "Appointment not found" }, 404);

    if (input.event === "request") {
      const age = Date.now() - new Date(appt.created_at).getTime();
      if (appt.status !== "pending" || age > 10 * 60 * 1000) return json({ error: "Request notification is no longer available" }, 403);
    } else if (!await isStaff(req)) {
      return json({ error: "Only clinic staff can send this appointment update" }, 403);
    }

    if (input.event === "confirmation" && appt.status !== "confirmed") return json({ error: "Appointment is not confirmed" }, 409);
    if (input.event === "cancelled" && appt.status !== "cancelled") return json({ error: "Appointment is not cancelled" }, 409);
    if (input.event === "reminder" && appt.status !== "confirmed") return json({ error: "Appointment is not confirmed" }, 409);

    const result = await sendEvent(appt as Appointment, input.event, input);
    return json(result, result.ok ? 200 : 502);
  } catch (error) {
    console.error("appointment-notification error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});