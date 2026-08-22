import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const bodySchema = z.object({
  phone: z.string().min(10).max(20),
  message: z.string().min(1).max(4000),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (!WA_TOKEN || !WA_PHONE_ID) return json({ error: "WhatsApp is not configured." }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);
    const { data: userRes } = await admin.auth.getUser(token);
    const email = userRes?.user?.email?.toLowerCase();
    if (!email) return json({ error: "Not authenticated" }, 401);
    const { data: staffRow } = await admin.from("admin_phones").select("id").ilike("email", email).maybeSingle();
    if (!staffRow) return json({ error: "Not authorized" }, 403);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const to = parsed.data.phone.replace(/\D/g, "");
    const message = parsed.data.message;

    const r = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
    });
    const out = await r.json();
    if (!r.ok) {
      console.error("WhatsApp send failed:", out);
      return json({ error: out?.error?.message ?? "WhatsApp send failed" }, 502);
    }

    const digits = to.slice(-10);
    const { data: patient } = await admin.from("patients").select("id").ilike("phone", `%${digits}`).maybeSingle();

    await admin.from("whatsapp_messages").insert({
      wa_message_id: out?.messages?.[0]?.id ?? null,
      direction: "outbound",
      phone: to,
      body: message,
      message_type: "text",
      handled_by_staff: true,
      patient_id: patient?.id ?? null,
    });

    return json({ ok: true });
  } catch (e) {
    console.error("whatsapp-send error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
