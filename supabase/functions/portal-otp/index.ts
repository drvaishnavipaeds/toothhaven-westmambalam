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
const WHATSAPP_BUSINESS_ACCOUNT_ID = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
const DEFAULT_COUNTRY_CODE = Deno.env.get("DEFAULT_COUNTRY_CODE") ?? "91";

type WhatsAppTemplate = {
  name: string;
  language: string;
  status: string;
  category?: string;
};

let templateCache: { expiresAt: number; templates: WhatsAppTemplate[] } | null = null;

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getApprovedTemplates(): Promise<WhatsAppTemplate[]> {
  if (!WHATSAPP_BUSINESS_ACCOUNT_ID || !WHATSAPP_ACCESS_TOKEN) return [];
  if (templateCache && templateCache.expiresAt > Date.now()) return templateCache.templates;

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`);
    url.searchParams.set("fields", "name,status,language,category");
    url.searchParams.set("limit", "100");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error("Unable to load WhatsApp templates:", response.status, JSON.stringify(payload));
      return [];
    }
    const templates = Array.isArray(payload?.data)
      ? payload.data.filter((template: WhatsAppTemplate) => template.status === "APPROVED")
      : [];
    templateCache = { expiresAt: Date.now() + 5 * 60 * 1000, templates };
    return templates;
  } catch (error) {
    console.error("Unable to load WhatsApp templates:", error);
    return [];
  }
}

async function sendWhatsApp(phone: string, code: string): Promise<{ ok: boolean; error?: string; configurationRequired?: boolean }> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.log("WhatsApp not configured. OTP for", phone, ":", code);
    return { ok: false, error: "WhatsApp not configured" };
  }
  const to = toE164(phone);
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Resolve against the templates that are actually approved in this WhatsApp account.
  // If the configured template is absent, another approved authentication template can
  // safely carry the same one-time code.
  const approved = await getApprovedTemplates();
  const configured = approved.filter((template) => template.name === WHATSAPP_TEMPLATE_NAME);
  const authenticationFallback = approved.filter((template) => template.category === "AUTHENTICATION");
  const candidates = configured.length > 0 ? configured : authenticationFallback;
  const attempts = candidates.length > 0
    ? candidates.map((template) => ({ name: template.name, language: template.language }))
    : [...new Set([WHATSAPP_TEMPLATE_LANG, "en_US", "en", "en_GB"])].map((language) => ({
        name: WHATSAPP_TEMPLATE_NAME,
        language,
      }));
  const bodyOnly = [{ type: "body", parameters: [{ type: "text", text: code }] }];
  const withButton = [
    ...bodyOnly,
    { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
  ];

  let lastError = "send failed";
  let templateMissing = false;
  for (const attempt of attempts) {
    for (const components of [withButton, bodyOnly]) {
      const payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: attempt.name, language: { code: attempt.language }, components },
      };
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) return { ok: true };
        lastError = data?.error?.message || `HTTP ${res.status}`;
        console.error("WhatsApp send failed:", attempt.name, attempt.language, res.status, JSON.stringify(data));
        // Language mismatch -> skip the second component variant, try next language
        if (data?.error?.code === 132001) {
          templateMissing = true;
          break;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : "send failed";
      }
    }
  }
  if (templateMissing) {
    return {
      ok: false,
      configurationRequired: true,
      error: "WhatsApp OTP is temporarily unavailable because no approved authentication template was found. Please use Email OTP or contact the clinic.",
    };
  }
  return { ok: false, error: lastError };
}


function validName(n: string) { return typeof n === "string" && n.trim().length >= 2 && n.trim().length <= 100; }
function validPhone(p: string) { return typeof p === "string" && /^\d{10}$/.test(p.trim()); }
function validEmail(e: string) { return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && e.length <= 255; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const action = body.action as string;

    // ---------- REGISTER: send OTP (WhatsApp only; email path uses register_finalize) ----------
    if (action === "register_send") {
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      const email = body.email ? String(body.email).trim().toLowerCase() : null;
      const dob = body.dob ? String(body.dob) : null;
      const gender = body.gender ? String(body.gender) : null;

      if (!validName(name)) return json({ error: "Please enter a valid name" }, 400);
      if (!validPhone(phone)) return json({ error: "Enter a valid 10-digit phone number" }, 400);
      if (email && !validEmail(email)) return json({ error: "Invalid email address" }, 400);

      // Duplicate check
      const { data: existing } = await supabase
        .from("patients")
        .select("id, phone, email")
        .or(`phone.eq.${phone}${email ? `,email.eq.${email}` : ""}`)
        .limit(1);
      if (existing && existing.length > 0) {
        return json({ error: "An account already exists with this phone or email. Please sign in instead.", already_exists: true }, 409);
      }

      // Rate limit
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("portal_otp_codes")
        .select("*", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", fifteenMinAgo);
      if ((count ?? 0) >= 3) return json({ error: "Too many requests. Try again in 15 minutes." }, 429);

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await hashCode(otp);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const pending = { name, phone, email, dob, gender };

      const sendResult = await sendWhatsApp(phone, otp);
      if (!sendResult.ok) {
        return json(
          { error: sendResult.error, configuration_required: sendResult.configurationRequired ?? false },
          sendResult.configurationRequired ? 422 : 502,
        );
      }
      const { error: saveError } = await supabase.from("portal_otp_codes").insert({
        phone,
        code_hash,
        expires_at,
        pending_registration: pending,
      });
      if (saveError) return json({ error: "OTP was sent, but verification could not be initialized. Please request a new code." }, 500);
      return json({ ok: true, message: "OTP sent via WhatsApp" });
    }

    // ---------- REGISTER: verify OTP + create patient (WhatsApp path) ----------
    if (action === "register_verify") {
      const phone = String(body.phone || "").trim();
      const code = String(body.code || "");
      if (!validPhone(phone)) return json({ error: "Invalid phone number" }, 400);
      if (!/^\d{6}$/.test(code)) return json({ error: "Invalid code format" }, 400);

      const code_hash = await hashCode(code);
      const { data: otps } = await supabase
        .from("portal_otp_codes")
        .select("*")
        .eq("phone", phone)
        .is("consumed_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const otp = otps?.[0];
      if (!otp || otp.code_hash !== code_hash) {
        if (otp) await supabase.from("portal_otp_codes").update({ attempts: (otp.attempts ?? 0) + 1 }).eq("id", otp.id);
        return json({ error: "Invalid or expired code" }, 401);
      }
      const pending = otp.pending_registration as { name: string; phone: string; email: string | null; dob: string | null; gender: string | null } | null;
      if (!pending) return json({ error: "No pending registration for this code" }, 400);

      // Insert patient (double-check no race)
      const { data: dup } = await supabase.from("patients").select("id").eq("phone", pending.phone).limit(1);
      if (dup && dup.length > 0) {
        await supabase.from("portal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
        return json({ error: "An account already exists. Please sign in.", already_exists: true }, 409);
      }

      const { error: insErr } = await supabase.from("patients").insert({
        name: pending.name,
        phone: pending.phone,
        email: pending.email,
        date_of_birth: pending.dob,
        gender: pending.gender,
      });
      if (insErr) return json({ error: `Registration failed: ${insErr.message}` }, 500);

      await supabase.from("portal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

      const sessionToken = `${pending.phone}.${Date.now() + 30 * 60 * 1000}`;
      const tokenSig = await hashCode(sessionToken + SERVICE_KEY);
      const token = btoa(`${sessionToken}.${tokenSig}`);
      return json({ ok: true, token, phone: pending.phone });
    }

    // ---------- REGISTER: finalize after Supabase email OTP verified (Email path) ----------
    if (action === "register_finalize") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user?.email) return json({ error: "Unauthorized" }, 401);
      const sessionEmail = userData.user.email.toLowerCase();

      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const dob = body.dob ? String(body.dob) : null;
      const gender = body.gender ? String(body.gender) : null;

      if (!validName(name)) return json({ error: "Please enter a valid name" }, 400);
      if (!validPhone(phone)) return json({ error: "Enter a valid 10-digit phone number" }, 400);
      if (!validEmail(email)) return json({ error: "Invalid email address" }, 400);
      if (email !== sessionEmail) return json({ error: "Email does not match verified session" }, 403);

      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .or(`phone.eq.${phone},email.eq.${email}`)
        .limit(1);
      if (existing && existing.length > 0) {
        return json({ error: "An account already exists. Please sign in.", already_exists: true }, 409);
      }

      const { error: insErr } = await supabase.from("patients").insert({
        name, phone, email, date_of_birth: dob, gender,
      });
      if (insErr) return json({ error: `Registration failed: ${insErr.message}` }, 500);

      const sessionToken = `${phone}.${Date.now() + 30 * 60 * 1000}`;
      const tokenSig = await hashCode(sessionToken + SERVICE_KEY);
      const token = btoa(`${sessionToken}.${tokenSig}`);
      return json({ ok: true, token, phone });
    }

    // ---------- Existing sign-in flows ----------
    const phone = String(body.phone || "").trim();
    if (!validPhone(phone)) return json({ error: "Invalid phone number" }, 400);

    if (action === "send") {
      const { data: patient } = await supabase
        .from("patients").select("id, name").eq("phone", phone).maybeSingle();
      if (!patient) return json({ error: "Phone number not registered. Please register or book an appointment first." }, 404);

      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("portal_otp_codes").select("*", { count: "exact", head: true })
        .eq("phone", phone).gte("created_at", fifteenMinAgo);
      if ((count ?? 0) >= 3) return json({ error: "Too many requests. Try again in 15 minutes." }, 429);

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await hashCode(otp);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const sendResult = await sendWhatsApp(phone, otp);
      if (!sendResult.ok) {
        return json(
          { error: sendResult.error, configuration_required: sendResult.configurationRequired ?? false },
          sendResult.configurationRequired ? 422 : 502,
        );
      }
      const { error: saveError } = await supabase.from("portal_otp_codes").insert({ phone, code_hash, expires_at });
      if (saveError) return json({ error: "OTP was sent, but verification could not be initialized. Please request a new code." }, 500);
      return json({ ok: true, message: "OTP sent via WhatsApp" });
    }

    if (action === "verify") {
      const code = String(body.code || "");
      if (!/^\d{6}$/.test(code)) return json({ error: "Invalid code format" }, 400);

      const code_hash = await hashCode(code);
      const { data: otps } = await supabase
        .from("portal_otp_codes").select("*").eq("phone", phone)
        .is("consumed_at", null).gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(1);

      const otp = otps?.[0];
      if (!otp || otp.code_hash !== code_hash) {
        if (otp) await supabase.from("portal_otp_codes").update({ attempts: (otp.attempts ?? 0) + 1 }).eq("id", otp.id);
        return json({ error: "Invalid or expired code" }, 401);
      }
      await supabase.from("portal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

      const sessionToken = `${phone}.${Date.now() + 30 * 60 * 1000}`;
      const tokenSig = await hashCode(sessionToken + SERVICE_KEY);
      const token = btoa(`${sessionToken}.${tokenSig}`);
      return json({ ok: true, token });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("portal-otp error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
