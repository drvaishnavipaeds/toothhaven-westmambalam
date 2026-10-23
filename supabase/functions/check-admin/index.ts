import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizePhone = (phone: unknown) => {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
};

const normalizeEmail = (email: unknown) => {
  if (typeof email !== "string") return null;
  const value = email.trim().toLowerCase();
  return value.includes("@") ? value : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);

    if (!phone && !email) {
      return new Response(JSON.stringify({ authorized: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("is_admin_identifier", {
      _phone: phone,
      _email: email,
    });

    if (error) throw error;

    let linkedStaff = false;
    if (email && !data) {
      const { data: member, error: staffError } = await supabase.from("staff")
        .select("user_id").eq("email", email).eq("status", "active").maybeSingle();
      if (staffError) throw staffError;
      if (member?.user_id) {
        const { count, error: roleError } = await supabase.from("user_roles")
          .select("user_id", { count: "exact", head: true }).eq("user_id", member.user_id);
        if (roleError) throw roleError;
        linkedStaff = (count ?? 0) > 0;
      }
    }

    return new Response(JSON.stringify({ authorized: !!data || linkedStaff }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-admin failed", error);
    return new Response(JSON.stringify({ authorized: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});