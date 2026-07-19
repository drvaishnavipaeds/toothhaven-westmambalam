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
    // Notifications must reference a real, staff-recorded payment row.
    // The `payments` table is staff-only via RLS, so unauthenticated callers
    // cannot spoof a paymentId that resolves.
    const body = await req.json().catch(() => ({}));
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId : null;

    if (!paymentId || !/^[0-9a-f-]{36}$/i.test(paymentId)) {
      return new Response(
        JSON.stringify({
          error:
            "paymentId of a verified payments row is required. Payment success is confirmed by staff after reconciliation.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (error || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message =
      `🦷 *Tooth Haven Payment Alert*\n\n` +
      `👤 Patient: ${sanitize((payment as any).patient_name ?? (payment as any).payer_name, 80)}\n` +
      `📱 Phone: ${sanitize((payment as any).patient_phone ?? (payment as any).payer_phone, 20)}\n` +
      `💰 Amount: ₹${sanitize((payment as any).amount, 20)}\n` +
      `📋 Purpose: ${sanitize((payment as any).purpose ?? (payment as any).description, 80)}\n` +
      `💳 Method: ${sanitize((payment as any).payment_method ?? (payment as any).method, 40)}\n` +
      `🕐 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    const CALLMEBOT_API_KEY = Deno.env.get("CALLMEBOT_API_KEY");
    let notificationSent = false;

    if (CALLMEBOT_API_KEY) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${OWNER_PHONE}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) notificationSent = true;
      } catch (e) {
        console.error("CallMeBot notification failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationSent,
        message: notificationSent
          ? "WhatsApp notification sent"
          : "Notification logged (CallMeBot not configured).",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
