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

    // Look up the trusted appointment record; only send notifications for
    // rows that actually exist in the database.
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("patient_name, patient_phone, appointment_date, treatment_type, notes, source, created_at")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error || !appt) return json({ error: "Appointment not found" }, 404);

    // Only notify for very recently created rows to prevent replay flooding.
    const createdMs = new Date(appt.created_at as string).getTime();
    if (Date.now() - createdMs > 10 * 60 * 1000) {
      return json({ ok: true, notificationSent: false, reason: "stale" });
    }

    const notifMessage =
      `🦷 *Tooth Haven - New Appointment*\n\n` +
      `👤 Patient: ${sanitize(appt.patient_name, 80)}\n` +
      `📱 Phone: ${sanitize(appt.patient_phone, 20)}\n` +
      `📅 Date: ${sanitize(appt.appointment_date, 20)}\n` +
      `🏥 Service: ${sanitize(appt.treatment_type, 80)}\n` +
      `💬 Note: ${sanitize(appt.notes, 300) || "None"}\n` +
      `🕐 Booked at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    if (!isConfigured()) {
      console.warn("WhatsApp not configured; appointment alert not delivered.");
      return json({ success: true, notificationSent: false, reason: "not_configured" });
    }

    const result = await sendText(OWNER_PHONE, notifMessage);
    if (result.ok) {
      await logMessage(supabase, {
        wa_message_id: result.id ?? null,
        direction: "outbound",
        phone: OWNER_PHONE,
        body: notifMessage,
        handled_by_staff: true,
      });
    } else {
      console.error("Appointment alert failed:", result.error);
    }

    return json({ success: true, notificationSent: result.ok, error: result.ok ? undefined : result.error });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});
