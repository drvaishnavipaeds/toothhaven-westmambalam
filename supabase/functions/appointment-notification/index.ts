import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_PHONE = "918925166149";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientName, patientPhone, appointmentDate, service, message: patientMessage } = await req.json();

    const notifMessage = `🦷 *Tooth Haven - New Appointment*\n\n` +
      `👤 Patient: ${patientName}\n` +
      `📱 Phone: ${patientPhone}\n` +
      `📅 Date: ${appointmentDate}\n` +
      `🏥 Service: ${service}\n` +
      `💬 Note: ${patientMessage || "None"}\n` +
      `🕐 Booked at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    const CALLMEBOT_API_KEY = Deno.env.get("CALLMEBOT_API_KEY");
    let notificationSent = false;

    if (CALLMEBOT_API_KEY) {
      try {
        const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${OWNER_PHONE}&text=${encodeURIComponent(notifMessage)}&apikey=${CALLMEBOT_API_KEY}`;
        const response = await fetch(callmebotUrl);
        if (response.ok) {
          notificationSent = true;
        }
      } catch (e) {
        console.error("CallMeBot notification failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notificationSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
