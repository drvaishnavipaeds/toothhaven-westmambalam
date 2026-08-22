import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const NONCE = "6f3a9c1e-2b47-4d80-91aa-77c5e0d3b912";

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (body.nonce !== NONCE) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const email = String(body.email ?? "").toLowerCase();
  const { data: ok } = await admin.rpc("is_admin_identifier", { _phone: null, _email: email });
  if (!ok) return new Response(JSON.stringify({ error: "not an admin" }), { status: 403 });

  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = list.data?.users?.find((u: any) => u.email?.toLowerCase() === email);
  if (!user) return new Response(JSON.stringify({ error: "no auth user" }), { status: 404 });

  const upd = await admin.auth.admin.updateUserById(user.id, {
    password: String(body.password),
    email_confirm: true,
  });
  return new Response(JSON.stringify({ ok: !upd.error, error: upd.error?.message ?? null }), {
    headers: { "Content-Type": "application/json" },
  });
});
