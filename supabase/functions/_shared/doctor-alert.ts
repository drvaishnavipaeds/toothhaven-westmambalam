import { DOCTOR_PHONE, DOCTOR_ALERT_TEMPLATE, appointmentReviewUrl } from "./doctor-alert-config.ts";
import { createMessageTemplate, DEFAULT_LANG, isWindowOpen, listApprovedTemplates, logMessage, sendTemplate, sendText, toE164 } from "./whatsapp.ts";

export async function sendDoctorAlert(admin: any, appt: any, message: string) {
  const eventKey = message.startsWith("New appointment request") ? "admin_request" : `admin_alert:${appt.status}`;
  const { data: existing, error: readError } = await admin.from("appointment_notifications").select("id,status,metadata").eq("appointment_id", appt.id).eq("event_key", eventKey).maybeSingle();
  if (readError) return { ok: false, error: "Could not read doctor notification status" };
  if (existing && ["sent", "delivered", "read"].includes(existing.status)) return { ok: true, duplicate: true };
  if (existing?.status === "sending") return { ok: false, inProgress: true, error: "Doctor notification is already being sent" };
  const url = appointmentReviewUrl(appt.id);
  const phone = toE164(DOCTOR_PHONE);
  const body = `${message}\n${appt.patient_name} • ${appt.patient_phone}\n${appt.treatment_type ?? "Dental consultation"}\n${appt.appointment_date} at ${appt.appointment_time}\nReview, Confirm, Reschedule or Cancel: ${url}`;
  const attempts = Number(existing?.metadata?.attempts ?? 0) + 1;
  const claim = { appointment_id: appt.id, event_type: eventKey === "admin_request" ? "admin_request" : "admin_alert", event_key: eventKey, phone, template_name: DOCTOR_ALERT_TEMPLATE, status: "sending", metadata: { reviewUrl: url, message, appointmentStatus: appt.status, attempts, lastAttemptAt: new Date().toISOString() }, error: null };
  const { data: claimed, error: ledgerError } = existing
    ? await admin.from("appointment_notifications").update(claim).eq("id", existing.id).eq("status", "failed").select("id").maybeSingle()
    : await admin.from("appointment_notifications").insert(claim).select("id").single();
  if (ledgerError) return { ok: false, error: "Could not track doctor notification" };
  if (!claimed) return { ok: false, inProgress: true, error: "Doctor notification is already being processed" };
  let result;
  try {
  if (await isWindowOpen(admin, DOCTOR_PHONE)) result = await sendText(DOCTOR_PHONE, body);
  if (!result?.ok) {
    const template = (await listApprovedTemplates()).find(t => t.name === DOCTOR_ALERT_TEMPLATE);
    result = template ? await sendTemplate({ to: DOCTOR_PHONE, name: template.name, language: template.language, bodyParams: [appt.patient_name, appt.patient_phone, appt.treatment_type ?? "Dental consultation", `${appt.appointment_date} ${appt.appointment_time}`, message, url] }) : { ok: false, configurationRequired: true, error: "Doctor review template awaits Meta approval and no free-text reply window is available." };
  }
  } catch {
    result = { ok: false, error: "Doctor notification transport failed" };
  }
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("appointment_notifications").update(result.ok ? { status: "sent", wa_message_id: result.id ?? null, sent_at: now, error: null, failed_at: null } : { status: "failed", error: result.error, failed_at: now }).eq("appointment_id", appt.id).eq("event_key", eventKey);
  if (result.ok) await logMessage(admin, { direction: "outbound", phone, wa_message_id: result.id ?? null, body, patient_id: appt.patient_id, template_name: DOCTOR_ALERT_TEMPLATE });
  return updateError ? { ok: false, error: "Doctor notification sent but tracking failed" } : result;
}

export async function retryFailedDoctorAlerts(admin: any, now = new Date()) {
  const { data: rows, error } = await admin.from("appointment_notifications")
    .select("id,appointment_id,event_key,metadata,failed_at")
    .in("event_type", ["admin_request", "admin_alert"]).eq("status", "failed")
    .eq("phone", toE164(DOCTOR_PHONE))
    .lte("failed_at", new Date(now.getTime() - 5 * 60000).toISOString())
    .order("failed_at", { ascending: true }).limit(50);
  if (error) throw new Error("Could not load failed doctor alerts");
  let retried = 0;
  for (const row of rows ?? []) {
    if (Number(row.metadata?.attempts ?? 1) >= 6) continue;
    const { data: appt, error: appointmentError } = await admin.from("appointments").select("*").eq("id", row.appointment_id).maybeSingle();
    if (appointmentError) continue;
    const expectedStatus = row.metadata?.appointmentStatus;
    const applicable = appt && (row.event_key === "admin_request" ? appt.status === "pending" : expectedStatus === appt.status);
    if (!applicable) {
      await admin.from("appointment_notifications").update({ status: "skipped", error: "Appointment has moved beyond this alert" }).eq("id", row.id).eq("status", "failed");
      continue;
    }
    if (typeof row.metadata?.message !== "string" && row.event_key !== "admin_request") continue;
    await sendDoctorAlert(admin, appt, row.metadata?.message ?? "New appointment request — please review.");
    retried++;
  }
  return { retried };
}

export async function doctorTemplateStatus() {
  const templates = await listApprovedTemplates(true, true);
  return { templates: templates.filter(t => t.name === DOCTOR_ALERT_TEMPLATE || t.name.startsWith("th_appointment_")).map(t => ({ name: t.name, language: t.language, status: t.status })) };
}

export async function submitDoctorTemplate() {
  const existing = (await listApprovedTemplates(true, true)).find(t => t.name === DOCTOR_ALERT_TEMPLATE && t.language === DEFAULT_LANG);
  if (existing) return { ok: true, existing: true, status: existing.status };
  return createMessageTemplate({ name: DOCTOR_ALERT_TEMPLATE, category: "UTILITY", language: DEFAULT_LANG,
    body: "Tooth Haven clinic appointment review: patient {{1}}, contact {{2}}, has requested service {{3}} at {{4}}. Clinic update: {{5}}. Please securely sign in to review this request and choose Confirm, Reschedule or Cancel using the appointment link: {{6}}. This message does not confirm the patient's appointment.",
    examples: ["Sample Patient", "9000000000", "Dental consultation", "2026-10-15 19:00", "New appointment request awaiting clinic approval", "https://www.toothhaven.in/admin/dashboard?tab=appointments&appointment=00000000-0000-0000-0000-000000000000"],
  });
}