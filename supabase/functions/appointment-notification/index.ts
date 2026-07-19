import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_PHONE = "918925166149";

function sanitize(s: unknown, max = 200): string {
  return String(s ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId : null;

    if (!appointmentId || !/^[0-9a-f-]{36}$/i.test(appointmentId)) {
      return new Response(JSON.stringify({ error: "appointmentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the trusted appointment record; only send notifications for
    // rows that actually exist in the database.
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("patient_name, patient_phone, appointment_date, treatment_type, notes, source, created_at")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error || !appt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only notify for very recently created rows to prevent replay flooding.
    const createdMs = new Date(appt.created_at as string).getTime();
    if (Date.now() - createdMs > 10 * 60 * 1000) {
      return new Response(JSON.stringify({ ok: true, notificationSent: false, reason: "stale" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifMessage =
      `🦷 *Tooth Haven - New Appointment*\n\n` +
      `👤 Patient: ${sanitize(appt.patient_name, 80)}\n` +
      `📱 Phone: ${sanitize(appt.patient_phone, 20)}\n` +
      `📅 Date: ${sanitize(appt.appointment_date, 20)}\n` +
      `🏥 Service: ${sanitize(appt.treatment_type, 80)}\n` +
      `💬 Note: ${sanitize(appt.notes, 300) || "None"}\n` +
      `🕐 Booked at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    const CALLMEBOT_API_KEY = Deno.env.get("CALLMEBOT_API_KEY");
    let notificationSent = false;

    if (CALLMEBOT_API_KEY) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${OWNER_PHONE}&text=${encodeURIComponent(notifMessage)}&apikey=${CALLMEBOT_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) notificationSent = true;
      } catch (e) {
        console.error("CallMeBot notification failed:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, notificationSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
