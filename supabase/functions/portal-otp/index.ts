import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_TEMPLATE_NAME = Deno.env.get("WHATSAPP_TEMPLATE_NAME") ?? "otp_verification";
const WHATSAPP_TEMPLATE_LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "en";
const DEFAULT_COUNTRY_CODE = Deno.env.get("DEFAULT_COUNTRY_CODE") ?? "91";

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
}

async function sendWhatsApp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.log("WhatsApp not configured. OTP for", phone, ":", code);
    return { ok: false, error: "WhatsApp not configured" };
  }
  const to = toE164(phone);
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WHATSAPP_TEMPLATE_NAME,
      language: { code: WHATSAPP_TEMPLATE_LANG },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("WhatsApp send failed:", res.status, JSON.stringify(data));
      // Retry without button component (in case template has no URL button)
      const simple = { ...payload, template: { ...payload.template, components: [payload.template.components[0]] } };
      const res2 = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(simple),
      });
      const data2 = await res2.json();
      if (!res2.ok) {
        console.error("WhatsApp retry failed:", res2.status, JSON.stringify(data2));
        return { ok: false, error: data2?.error?.message || `HTTP ${res2.status}` };
      }
      console.log("WhatsApp sent (body-only) to", to, data2);
      return { ok: true };
    }
    console.log("WhatsApp sent to", to, data);
    return { ok: true };
  } catch (e) {
    console.error("WhatsApp send exception:", e);
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { action, phone, code } = await req.json();
    const cleanPhone = (phone || "").trim();

    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      // Verify phone exists in patients table
      const { data: patient } = await supabase
        .from("patients")
        .select("id, name")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (!patient) {
        return new Response(JSON.stringify({ error: "Phone number not registered. Please book an appointment first." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: max 3 codes per 15 min
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("portal_otp_codes")
        .select("*", { count: "exact", head: true })
        .eq("phone", cleanPhone)
        .gte("created_at", fifteenMinAgo);
      if ((count ?? 0) >= 3) {
        return new Response(JSON.stringify({ error: "Too many requests. Try again in 15 minutes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await hashCode(otp);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("portal_otp_codes").insert({ phone: cleanPhone, code_hash, expires_at });
      await sendWhatsApp(cleanPhone, otp);

      return new Response(JSON.stringify({ ok: true, message: "OTP sent via WhatsApp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code || !/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: "Invalid code format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const code_hash = await hashCode(code);
      const { data: otps } = await supabase
        .from("portal_otp_codes")
        .select("*")
        .eq("phone", cleanPhone)
        .is("consumed_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const otp = otps?.[0];
      if (!otp || otp.code_hash !== code_hash) {
        if (otp) {
          await supabase.from("portal_otp_codes").update({ attempts: (otp.attempts ?? 0) + 1 }).eq("id", otp.id);
        }
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("portal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

      // Issue a simple session token (HMAC) valid 30 min
      const sessionToken = `${cleanPhone}.${Date.now() + 30 * 60 * 1000}`;
      const tokenSig = await hashCode(sessionToken + SERVICE_KEY);
      const token = btoa(`${sessionToken}.${tokenSig}`);

      return new Response(JSON.stringify({ ok: true, token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-otp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
