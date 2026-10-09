import { DOCTOR_PHONE, DOCTOR_ALERT_TEMPLATE, appointmentReviewUrl } from "./doctor-alert-config.ts";
import { createMessageTemplate, DEFAULT_LANG, isWindowOpen, listApprovedTemplates, logMessage, sendTemplate, sendText, toE164 } from "./whatsapp.ts";

export async function sendDoctorAlert(admin: any, appt: any, message: string) {
  const eventKey = message.startsWith("New appointment request") ? "admin_request" : `admin_alert:${appt.status}`;
  const { data: existing, error: readError } = await admin.from("appointment_notifications").select("id,status").eq("appointment_id", appt.id).eq("event_key", eventKey).maybeSingle();
  if (readError) return { ok: false, error: "Could not read doctor notification status" };
  if (existing && ["sent", "delivered", "read", "sending"].includes(existing.status)) return { ok: true, duplicate: true };
  const url = appointmentReviewUrl(appt.id);
  const phone = toE164(DOCTOR_PHONE);
  const body = `${message}\n${appt.patient_name} • ${appt.patient_phone}\n${appt.treatment_type ?? "Dental consultation"}\n${appt.appointment_date} at ${appt.appointment_time}\nReview, Confirm, Reschedule or Cancel: ${url}`;
  const { error: ledgerError } = await admin.from("appointment_notifications").upsert({ appointment_id: appt.id, event_type: eventKey === "admin_request" ? "admin_request" : "admin_alert", event_key: eventKey, phone, template_name: DOCTOR_ALERT_TEMPLATE, status: "sending", metadata: { reviewUrl: url }, error: null }, { onConflict: "appointment_id,event_key" });
  if (ledgerError) return { ok: false, error: "Could not track doctor notification" };
  let result;
  if (await isWindowOpen(admin, DOCTOR_PHONE)) result = await sendText(DOCTOR_PHONE, body);
  if (!result?.ok) {
    const template = (await listApprovedTemplates()).find(t => t.name === DOCTOR_ALERT_TEMPLATE);
    result = template ? await sendTemplate({ to: DOCTOR_PHONE, name: template.name, language: template.language, bodyParams: [appt.patient_name, appt.patient_phone, appt.treatment_type ?? "Dental consultation", `${appt.appointment_date} ${appt.appointment_time}`, message, url] }) : { ok: false, configurationRequired: true, error: "Doctor review template awaits Meta approval and no free-text reply window is available." };
  }
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("appointment_notifications").update(result.ok ? { status: "sent", wa_message_id: result.id ?? null, sent_at: now, error: null, failed_at: null } : { status: "failed", error: result.error, failed_at: now }).eq("appointment_id", appt.id).eq("event_key", eventKey);
  if (result.ok) await logMessage(admin, { direction: "outbound", phone, wa_message_id: result.id ?? null, body, patient_id: appt.patient_id, template_name: DOCTOR_ALERT_TEMPLATE });
  return updateError ? { ok: false, error: "Doctor notification sent but tracking failed" } : result;
}

export function submitDoctorTemplate() {
  return createMessageTemplate({ name: DOCTOR_ALERT_TEMPLATE, category: "UTILITY", language: DEFAULT_LANG,
    body: "Tooth Haven clinic appointment review: patient {{1}}, contact {{2}}, has requested service {{3}} at {{4}}. Clinic update: {{5}}. Please securely sign in to review this request and choose Confirm, Reschedule or Cancel using the appointment link: {{6}}. This message does not confirm the patient's appointment.",
    examples: ["Sample Patient", "9000000000", "Dental consultation", "2026-10-15 19:00", "New appointment request awaiting clinic approval", "https://www.toothhaven.in/admin/dashboard?tab=appointments&appointment=00000000-0000-0000-0000-000000000000"],
  });
}