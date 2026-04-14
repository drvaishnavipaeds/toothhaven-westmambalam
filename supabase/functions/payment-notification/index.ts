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
    const { patientName, patientPhone, amount, purpose, paymentMethod } = await req.json();

    const message = `🦷 *Tooth Haven Payment Alert*\n\n` +
      `👤 Patient: ${patientName}\n` +
      `📱 Phone: ${patientPhone}\n` +
      `💰 Amount: ₹${amount}\n` +
      `📋 Purpose: ${purpose}\n` +
      `💳 Method: ${paymentMethod}\n` +
      `🕐 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    // Send WhatsApp notification via WhatsApp API link
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${OWNER_PHONE}&text=${encodeURIComponent(message)}`;

    // For automated WhatsApp, we'll use the free CallMeBot API
    // The owner needs to register once: send "I allow callmebot to send me messages" to +34 644 31 89 43 on WhatsApp
    const CALLMEBOT_API_KEY = Deno.env.get("CALLMEBOT_API_KEY");
    
    let notificationSent = false;

    if (CALLMEBOT_API_KEY) {
      try {
        const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${OWNER_PHONE}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_API_KEY}`;
        const response = await fetch(callmebotUrl);
        if (response.ok) {
          notificationSent = true;
        }
      } catch (e) {
        console.error("CallMeBot notification failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationSent,
        whatsappUrl,
        message: notificationSent
          ? "WhatsApp notification sent automatically"
          : "Notification logged. Set up CallMeBot for auto WhatsApp alerts.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
