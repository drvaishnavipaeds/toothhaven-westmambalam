import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { sendText } from "../_shared/whatsapp.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const gatewayKey = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
const lovableKey = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const ADMIN_PHONE = "8925166149";
const TZ = "+05:30";

const bookingSchema = z.object({ action: z.literal("book"), portalToken: z.string().min(10), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), service: z.string().trim().min(2).max(100), durationMinutes: z.number().int().min(30).max(180).default(30), notes: z.string().trim().max(500).optional() });
const availabilitySchema = z.object({ action: z.literal("availability"), portalToken: z.string().min(10), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), durationMinutes: z.number().int().min(30).max(180).default(30) });
const portalDataSchema = z.object({ action: z.literal("portal_data"), portalToken: z.string().min(10) });
const staffSchema = z.object({ action: z.enum(["confirm", "reschedule", "cancel", "retry"]), appointmentId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), time: z.string().regex(/^\d{2}:\d{2}$/).optional(), reason: z.string().trim().min(2).max(300).optional() });

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function configured() { return Boolean(gatewayKey && lovableKey); }
function jwtRole(req: Request): string | null {
  const payload = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")))?.role ?? null;
  } catch { return null; }
}
function scheduledAt(date: string, time: string) { return new Date(`${date}T${time}:00${TZ}`); }
function clinicSlots(date: string, duration = 30) {
  const day = scheduledAt(date, "12:00").getUTCDay();
  if (day === 0) return [];
  const out: string[] = [];
  for (const [start, end] of [[11 * 60, 14 * 60], [18 * 60, 21 * 60]]) {
    for (let minute = start; minute + duration <= end; minute += 30) out.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return out;
}
async function calendar(path: string, init: RequestInit = {}) {
  if (!configured()) throw new Error("Google Calendar authorization required");
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gatewayKey!, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}
async function verifyPortal(token: string) {
  try {
    const decoded = atob(token); const parts = decoded.split(".");
    if (parts.length < 3) return null;
    const phone = parts[0], expires = Number(parts[1]), signature = parts.slice(2).join(".");
    if (!/^\d{10}$/.test(phone) || expires < Date.now()) return null;
    const raw = `${phone}.${expires}` + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const expected = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return signature === expected ? phone : null;
  } catch { return null; }
}
async function isStaff(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await admin.auth.getUser(token); const email = data.user?.email;
  if (!email) return false;
  const { data: row } = await admin.from("admin_phones").select("id").ilike("email", email).maybeSingle();
  return Boolean(row);
}
async function portalData(portalToken: string) {
  const phone = await verifyPortal(portalToken);
  if (!phone) return { error: "Patient session expired", status: 401 };
  const { data: patient, error } = await admin.from("patients").select("*").eq("phone", phone).maybeSingle();
  if (error) throw error;
  if (!patient) return { error: "Patient record not found", status: 404 };
  const [appointments, treatments] = await Promise.all([
    admin.from("appointments").select("*").eq("patient_id", patient.id).order("appointment_date", { ascending: false }),
    admin.from("treatments").select("*").eq("patient_id", patient.id).order("treatment_date", { ascending: false }),
  ]);
  if (appointments.error) throw appointments.error;
  if (treatments.error) throw treatments.error;
  return { ok: true, patient, appointments: appointments.data ?? [], treatments: treatments.data ?? [] };
}
async function busy(date: string, duration: number, excludeId?: string) {
  const timeMin = scheduledAt(date, "00:00").toISOString();
  const timeMax = scheduledAt(date, "23:59").toISOString();
  const external = await calendar(`/freeBusy`, { method: "POST", body: JSON.stringify({ timeMin, timeMax, timeZone: "Asia/Kolkata", items: [{ id: "primary" }] }) });
  let query = admin.from("appointments").select("id,appointment_time,duration_minutes").eq("appointment_date", date).in("status", ["pending", "tentative", "confirmed", "rescheduled"]);
  if (excludeId) query = query.neq("id", excludeId);
  const { data: local, error } = await query; if (error) throw error;
  return { google: external?.calendars?.primary?.busy ?? [], local: local ?? [], duration };
}
function overlaps(start: Date, end: Date, bStart: Date, bEnd: Date) { return start < bEnd && end > bStart; }
async function available(date: string, duration: number, excludeId?: string) {
  const blocked = await busy(date, duration, excludeId);
  return clinicSlots(date, duration).filter((time) => {
    const start = scheduledAt(date, time), end = new Date(start.getTime() + duration * 60000);
    const googleBusy = blocked.google.some((b: any) => overlaps(start, end, new Date(b.start), new Date(b.end)));
    const localBusy = blocked.local.some((a: any) => { const s = scheduledAt(date, a.appointment_time); return overlaps(start, end, s, new Date(s.getTime() + Math.max(a.duration_minutes ?? 30, 30) * 60000)); });
    return !googleBusy && !localBusy;
  });
}
async function eventWrite(appt: any, tentative: boolean) {
  const start = scheduledAt(appt.appointment_date, appt.appointment_time);
  const end = new Date(start.getTime() + Math.max(appt.duration_minutes ?? 30, 30) * 60000);
  const payload = { summary: `${tentative ? "TENTATIVE — " : ""}${appt.patient_name} — ${appt.treatment_type ?? "Dental consultation"}`, description: `Tooth Haven appointment ${appt.id}. ${tentative ? "Awaiting clinic confirmation; auto-expires after 24 hours." : "Confirmed by clinic."}`, start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" }, end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" } };
  if (appt.google_event_id) return await calendar(`/calendars/primary/events/${encodeURIComponent(appt.google_event_id)}`, { method: "PUT", body: JSON.stringify(payload) });
  return await calendar(`/calendars/primary/events`, { method: "POST", body: JSON.stringify(payload) });
}
async function removeEvent(id?: string | null) { if (id) await calendar(`/calendars/primary/events/${encodeURIComponent(id)}`, { method: "DELETE" }); }
async function notify(id: string, event: string, extra: Record<string, string> = {}) {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/appointment-notification`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` }, body: JSON.stringify({ appointmentId: id, event, ...extra }) });
  return await res.json().catch(() => ({ ok: false }));
}
async function alertAdmin(appt: any, message: string) { return await sendText(ADMIN_PHONE, `${message}\n${appt.patient_name} • ${appt.patient_phone}\n${appt.treatment_type ?? "Dental consultation"}\n${appt.appointment_date} at ${appt.appointment_time}\nOpen Admin > Appointments to Confirm, Reschedule or Cancel.`); }

async function runLifecycle() {
  const now = new Date(); let processed = 0;
  const { data: rows } = await admin.from("appointments").select("*").in("status", ["pending", "tentative", "confirmed", "rescheduled"]);
  for (const appt of rows ?? []) {
    try {
      if (appt.status === "pending" && appt.confirmation_deadline && new Date(appt.confirmation_deadline) <= now) {
        const slots = await available(appt.appointment_date, appt.duration_minutes ?? 30, appt.id);
        if (slots.includes(appt.appointment_time)) {
          const event = await eventWrite(appt, true); const expiry = new Date(now.getTime() + 24 * 3600000).toISOString();
          await admin.from("appointments").update({ status: "tentative", google_event_id: event.id, calendar_sync_status: "synced", tentative_created_at: now.toISOString(), tentative_expires_at: expiry, last_lifecycle_action: "tentative_created", lifecycle_processed_at: now.toISOString() }).eq("id", appt.id).eq("status", "pending");
          await notify(appt.id, "tentative"); await alertAdmin(appt, "Tentative hold created after 10 minutes.");
        } else {
          const alternatives = slots.slice(0, 3); await admin.from("appointments").update({ status: "conflict", proposed_alternatives: alternatives, calendar_sync_status: "conflict", last_lifecycle_action: "slot_conflict", lifecycle_processed_at: now.toISOString() }).eq("id", appt.id).eq("status", "pending");
          await notify(appt.id, "alternatives"); await alertAdmin(appt, `Requested slot became unavailable. Alternatives: ${alternatives.join(", ") || "none"}.`);
        }
        processed++;
      } else if (appt.status === "tentative" && appt.tentative_expires_at && new Date(appt.tentative_expires_at) <= now) {
        await removeEvent(appt.google_event_id); await admin.from("appointments").update({ status: "expired", expired_at: now.toISOString(), calendar_sync_status: "released", google_event_id: null, last_lifecycle_action: "tentative_expired", lifecycle_processed_at: now.toISOString() }).eq("id", appt.id).eq("status", "tentative");
        await notify(appt.id, "expired"); await alertAdmin(appt, "Tentative hold expired and needs follow-up."); processed++;
      } else if (["confirmed", "rescheduled"].includes(appt.status)) {
        const hours = (scheduledAt(appt.appointment_date, appt.appointment_time).getTime() - now.getTime()) / 3600000;
        if (!appt.reminder_24h_sent_at && hours > 23.9 && hours <= 24.1) { const r = await notify(appt.id, "reminder_24h"); if (r.ok) await admin.from("appointments").update({ reminder_24h_sent_at: now.toISOString() }).eq("id", appt.id); }
        if (!appt.reminder_2h_sent_at && hours > 1.9 && hours <= 2.1) { const r = await notify(appt.id, "reminder_2h"); if (r.ok) await admin.from("appointments").update({ reminder_2h_sent_at: now.toISOString() }).eq("id", appt.id); }
      }
    } catch (error) { await admin.from("appointments").update({ calendar_sync_status: "failed", calendar_sync_error: error instanceof Error ? error.message : "Lifecycle failed" }).eq("id", appt.id); }
  }
  return { ok: true, checked: rows?.length ?? 0, processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.json().catch(() => ({}));
    if (raw.action === "lifecycle") { if (jwtRole(req) !== "service_role") return json({ error: "Forbidden" }, 403); return json(await runLifecycle()); }
    if (raw.action === "portal_data") {
      const input = portalDataSchema.parse(raw);
      const result = await portalData(input.portalToken);
      return json(result, "status" in result ? result.status : 200);
    }
    if (!configured()) return json({ error: "Google Calendar authorization is required before online slots can be shown.", calendarAuthorizationRequired: true }, 503);
    if (raw.action === "availability") {
      const input = availabilitySchema.parse(raw); const phone = await verifyPortal(input.portalToken); if (!phone) return json({ error: "Patient session expired" }, 401);
      return json({ ok: true, date: input.date, slots: await available(input.date, input.durationMinutes) });
    }
    if (raw.action === "book") {
      const input = bookingSchema.parse(raw); const phone = await verifyPortal(input.portalToken); if (!phone) return json({ error: "Patient session expired" }, 401);
      const slots = await available(input.date, input.durationMinutes); if (!slots.includes(input.time)) return json({ error: "This slot is no longer available", alternatives: slots.slice(0, 3) }, 409);
      const { data: patient } = await admin.from("patients").select("id,name,phone").eq("phone", phone).maybeSingle(); if (!patient) return json({ error: "Patient record not found" }, 404);
      const { data: appt, error } = await admin.from("appointments").insert({ patient_id: patient.id, patient_name: patient.name, patient_phone: patient.phone, appointment_date: input.date, appointment_time: input.time, duration_minutes: input.durationMinutes, treatment_type: input.service, notes: input.notes ?? null, status: "pending", source: "patient_portal", confirmation_deadline: new Date(Date.now() + 10 * 60000).toISOString(), calendar_sync_status: "not_synced" }).select("*").single();
      if (error) return json({ error: error.message }, error.message.includes("no longer available") ? 409 : 400);
      await alertAdmin(appt, "New appointment request — please act within 10 minutes."); return json({ ok: true, appointment: appt }, 201);
    }
    const input = staffSchema.parse(raw); if (!await isStaff(req)) return json({ error: "Only clinic staff can manage appointments" }, 403);
    const { data: appt } = await admin.from("appointments").select("*").eq("id", input.appointmentId).maybeSingle(); if (!appt) return json({ error: "Appointment not found" }, 404);
    if (input.action === "cancel") { if (!input.reason) return json({ error: "Cancellation reason is required" }, 400); await removeEvent(appt.google_event_id); await admin.from("appointments").update({ status: "cancelled", cancellation_reason: input.reason, google_event_id: null, calendar_sync_status: "released", last_lifecycle_action: "cancelled" }).eq("id", appt.id); await notify(appt.id, "cancelled", { reason: input.reason }); return json({ ok: true }); }
    const date = input.date ?? appt.appointment_date, time = input.time ?? appt.appointment_time;
    const slots = await available(date, appt.duration_minutes ?? 30, appt.id); if (!slots.includes(time)) return json({ error: "This slot is no longer available", alternatives: slots.slice(0, 3) }, 409);
    const next = { ...appt, appointment_date: date, appointment_time: time }; const event = await eventWrite(next, false);
    const rescheduled = date !== appt.appointment_date || time !== appt.appointment_time;
    await admin.from("appointments").update({ appointment_date: date, appointment_time: time, status: rescheduled ? "rescheduled" : "confirmed", google_event_id: event.id, calendar_sync_status: "synced", calendar_sync_error: null, tentative_expires_at: null, confirmation_deadline: null, reminder_24h_sent_at: null, reminder_2h_sent_at: null, last_lifecycle_action: rescheduled ? "rescheduled" : "confirmed" }).eq("id", appt.id);
    await notify(appt.id, rescheduled ? "rescheduled" : "confirmation", rescheduled ? { previousDate: appt.appointment_date, previousTime: appt.appointment_time } : {});
    return json({ ok: true, status: rescheduled ? "rescheduled" : "confirmed" });
  } catch (error) { console.error("appointment-workflow error", error); return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500); }
});