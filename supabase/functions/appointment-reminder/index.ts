import { createClient } from "npm:@supabase/supabase-js@2";
import { isConfigured, logMessage, sendText } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_PHONE = Deno.env.get("CLINIC_NOTIFY_PHONE") ?? "918925166149";

function sanitize(s: unknown, max = 200): string {
  return String(s ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId : null;

    if (!appointmentId || !/^[0-9a-f-]{36}$/i.test(appointmentId)) {
      return json({ error: "appointmentId required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the appointment details
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("patient_name, patient_phone, appointment_date, appointment_time, treatment_type, status, created_at")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error || !appt) return json({ error: "Appointment not found" }, 404);

    // Only send reminders for confirmed appointments
    if (appt.status !== "confirmed" && appt.status !== "scheduled") {
      return json({ ok: true, reminderSent: false, reason: "appointment_not_confirmed" });
    }

    if (!isConfigured()) {
      console.warn("WhatsApp not configured; appointment reminders not delivered.");
      return json({ success: true, reminderSent: false, reason: "not_configured" });
    }

    // Admin reminder notification
    const adminReminderMessage =
      `🦷 *Tooth Haven - Appointment Reminder (24 Hours)*\n\n` +
      `📋 UPCOMING APPOINTMENT\n\n` +
      `👤 Patient: ${sanitize(appt.patient_name, 80)}\n` +
      `📱 Phone: ${sanitize(appt.patient_phone, 20)}\n` +
      `📅 Date: ${sanitize(appt.appointment_date, 20)}\n` +
      `⏰ Time: ${sanitize(appt.appointment_time || "TBD", 20)}\n` +
      `🏥 Service: ${sanitize(appt.treatment_type, 80)}\n` +
      `✅ Status: ${appt.status}\n\n` +
      `Please ensure you're prepared for this appointment.`;

    // Patient reminder notification
    const patientReminderMessage =
      `🦷 *Appointment Reminder - See You Tomorrow!*\n\n` +
      `Hi ${sanitize(appt.patient_name, 50)},\n\n` +
      `This is a friendly reminder about your upcoming appointment:\n\n` +
      `📅 Date: ${sanitize(appt.appointment_date, 20)}\n` +
      `⏰ Time: ${sanitize(appt.appointment_time || "TBD", 20)}\n` +
      `🏥 Service: ${sanitize(appt.treatment_type, 80)}\n\n` +
      `We look forward to seeing you!\n\n` +
      `If you need to reschedule, please let us know ASAP.\n` +
      `Call us or reply to this message.\n\n` +
      `Thank you! 🙏`;

    let adminReminderSent = false;
    let patientReminderSent = false;
    let adminError = null;
    let patientError = null;

    // Send admin reminder
    try {
      const adminResult = await sendText(OWNER_PHONE, adminReminderMessage);
      adminReminderSent = adminResult.ok;
      adminError = adminResult.error;
      if (adminResult.ok) {
        await logMessage(supabase, {
          wa_message_id: adminResult.id ?? null,
          direction: "outbound",
          phone: OWNER_PHONE,
          body: adminReminderMessage,
          handled_by_staff: true,
        });
      } else {
        console.error("Admin reminder failed:", adminResult.error);
      }
    } catch (err) {
      console.error("Error sending admin reminder:", err);
      adminError = (err as Error).message;
    }

    // Send patient reminder
    try {
      const patientResult = await sendText(appt.patient_phone, patientReminderMessage);
      patientReminderSent = patientResult.ok;
      patientError = patientResult.error;
      if (patientResult.ok) {
        await logMessage(supabase, {
          wa_message_id: patientResult.id ?? null,
          direction: "outbound",
          phone: appt.patient_phone,
          body: patientReminderMessage,
          handled_by_staff: false,
        });
      } else {
        console.error("Patient reminder failed:", patientResult.error);
      }
    } catch (err) {
      console.error("Error sending patient reminder:", err);
      patientError = (err as Error).message;
    }

    return json({
      success: true,
      remindersSent: {
        admin: adminReminderSent,
        patient: patientReminderSent,
      },
      errors: {
        admin: adminError,
        patient: patientError,
      },
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});
