import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendOtpTemplate } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const sendWhatsApp = (phone10: string, code: string) => sendOtpTemplate(phone10, code);

function syntheticEmail(phone10: string): string {
  return `admin+${phone10}@toothhaven.internal`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;
    const phone10 = normalizePhone(body.phone);

    if (!phone10) return jsonResponse({ error: "Invalid phone number" }, 400);

    // Authorize admin
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin_identifier", {
      _phone: phone10,
      _email: null,
    });
    if (adminErr) {
      console.error("is_admin_identifier error", adminErr);
      return jsonResponse({ error: "Authorization check failed" }, 500);
    }
    if (!isAdmin) return jsonResponse({ error: "This phone number is not authorized as admin." }, 403);

    if (action === "send") {
      // Rate limit: 3 per 15 min
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("portal_otp_codes")
        .select("*", { count: "exact", head: true })
        .eq("phone", phone10)
        .gte("created_at", fifteenMinAgo);
      if ((count ?? 0) >= 3) {
        return jsonResponse({ error: "Too many requests. Try again in 15 minutes." }, 429);
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await hashCode(otp);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Attempt WhatsApp send FIRST — only persist (and count against rate limit) on success.
      const send = await sendWhatsApp(phone10, otp);
      if (!send.ok) return jsonResponse({ error: `Failed to send OTP: ${send.error}` }, 502);

      await supabase.from("portal_otp_codes").insert({ phone: phone10, code_hash, expires_at });

      return jsonResponse({ ok: true, message: "OTP sent via WhatsApp" });
    }

    if (action === "verify") {
      const code = body.code as string | undefined;
      if (!code || !/^\d{6}$/.test(code)) return jsonResponse({ error: "Invalid code format" }, 400);

      const code_hash = await hashCode(code);
      const { data: otps } = await supabase
        .from("portal_otp_codes")
        .select("*")
        .eq("phone", phone10)
        .is("consumed_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const otp = otps?.[0];
      if (!otp || otp.code_hash !== code_hash) {
        if (otp) {
          await supabase.from("portal_otp_codes").update({ attempts: (otp.attempts ?? 0) + 1 }).eq("id", otp.id);
        }
        return jsonResponse({ error: "Invalid or expired code" }, 401);
      }
      await supabase.from("portal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

      // Ensure synthetic auth user exists
      const email = syntheticEmail(phone10);

      // Try to find existing user by email via listUsers filter
      let userId: string | null = null;
      try {
        // @ts-ignore - getUserByEmail not typed in this SDK version
        const found = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        const match = found.data?.users?.find((u: any) => u.email?.toLowerCase() === email);
        if (match) userId = match.id;
      } catch (e) {
        console.warn("listUsers failed, will attempt create", e);
      }

      if (!userId) {
        const created = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { admin_phone: phone10, admin_login: "whatsapp_otp" },
        });
        if (created.error || !created.data.user) {
          // If user already exists, fetch again
          console.error("createUser error", created.error);
          return jsonResponse({ error: "Failed to provision admin session" }, 500);
        }
        userId = created.data.user.id;
      } else {
        // Make sure metadata is set
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { admin_phone: phone10, admin_login: "whatsapp_otp" },
        });
      }

      // Generate magic link and return hashed_token for client-side verifyOtp
      const link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error || !link.data?.properties?.hashed_token) {
        console.error("generateLink error", link.error);
        return jsonResponse({ error: "Failed to issue session token" }, 500);
      }

      return jsonResponse({
        ok: true,
        token_hash: link.data.properties.hashed_token,
        email,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-phone-otp error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
