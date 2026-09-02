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

    if (!isConfigured()) {
      console.warn("WhatsApp not configured; payment alert not delivered.");
      return new Response(
        JSON.stringify({ success: true, notificationSent: false, message: "WhatsApp is not configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await sendText(OWNER_PHONE, message);
    const notificationSent = result.ok;
    if (result.ok) {
      await logMessage(supabase, {
        wa_message_id: result.id ?? null,
        direction: "outbound",
        phone: OWNER_PHONE,
        body: message,
        handled_by_staff: true,
      });
    } else {
      console.error("Payment alert failed:", result.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationSent,
        message: notificationSent
          ? "WhatsApp notification sent"
          : `Notification failed: ${result.error ?? "unknown error"}`,
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
