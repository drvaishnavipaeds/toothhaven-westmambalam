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
    const cancellationReason = typeof body?.reason === "string" ? body.reason : "Appointment cancelled";

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
      .select("patient_name, patient_phone, appointment_date, appointment_time, treatment_type, status")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error || !appt) return json({ error: "Appointment not found" }, 404);

    if (!isConfigured()) {
      console.warn("WhatsApp not configured; appointment cancellation notifications not delivered.");
      return json({ success: true, notificationSent: false, reason: "not_configured" });
    }

    // Admin cancellation notification
    const adminCancelMessage =
      `🦷 *Tooth Haven - Appointment Cancelled*\n\n` +
      `⚠️ CANCELLATION ALERT\n\n` +
      `👤 Patient: ${sanitize(appt.patient_name, 80)}\n` +
      `📱 Phone: ${sanitize(appt.patient_phone, 20)}\n` +
      `📅 Date: ${sanitize(appt.appointment_date, 20)}\n` +
      `⏰ Time: ${sanitize(appt.appointment_time || "TBD", 20)}\n` +
      `🏥 Service: ${sanitize(appt.treatment_type, 80)}\n` +
      `📝 Reason: ${sanitize(cancellationReason, 200)}\n\n` +
      `Status: CANCELLED`;

    // Patient cancellation notification
    const patientCancelMessage =
      `🦷 *Appointment Cancelled*\n\n` +
      `Hi ${sanitize(appt.patient_name, 50)},\n\n` +
      `Your appointment has been cancelled.\n\n` +
      `📅 Date: ${sanitize(appt.appointment_date, 20)}\n` +
      `⏰ Time: ${sanitize(appt.appointment_time || "TBD", 20)}\n` +
      `🏥 Service: ${sanitize(appt.treatment_type, 80)}\n` +
      `📝 Reason: ${sanitize(cancellationReason, 200)}\n\n` +
      `If you'd like to reschedule, please contact us or book another appointment.\n\n` +
      `Thank you! 🙏`;

    let adminCancelSent = false;
    let patientCancelSent = false;
    let adminError = null;
    let patientError = null;

    // Send admin cancellation
    try {
      const adminResult = await sendText(OWNER_PHONE, adminCancelMessage);
      adminCancelSent = adminResult.ok;
      adminError = adminResult.error;
      if (adminResult.ok) {
        await logMessage(supabase, {
          wa_message_id: adminResult.id ?? null,
          direction: "outbound",
          phone: OWNER_PHONE,
          body: adminCancelMessage,
          handled_by_staff: true,
        });
      } else {
        console.error("Admin cancellation notification failed:", adminResult.error);
      }
    } catch (err) {
      console.error("Error sending admin cancellation:", err);
      adminError = (err as Error).message;
    }

    // Send patient cancellation
    try {
      const patientResult = await sendText(appt.patient_phone, patientCancelMessage);
      patientCancelSent = patientResult.ok;
      patientError = patientResult.error;
      if (patientResult.ok) {
        await logMessage(supabase, {
          wa_message_id: patientResult.id ?? null,
          direction: "outbound",
          phone: appt.patient_phone,
          body: patientCancelMessage,
          handled_by_staff: false,
        });
      } else {
        console.error("Patient cancellation notification failed:", patientResult.error);
      }
    } catch (err) {
      console.error("Error sending patient cancellation:", err);
      patientError = (err as Error).message;
    }

    return json({
      success: true,
      cancellationNotificationsSent: {
        admin: adminCancelSent,
        patient: patientCancelSent,
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
