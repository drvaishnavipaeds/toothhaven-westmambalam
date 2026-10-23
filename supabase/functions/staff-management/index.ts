import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { canManageStaff, validateStaffChange } from "../_shared/staff-access.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return reply({ error: "Staff service unavailable" }, 503);
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Sign in to continue" }, 401);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await db.auth.getUser(token);
    if (authError || !identity.user) return reply({ error: "Sign in to continue" }, 401);
    const actor = identity.user;
    const [{ data: roles, error: roleError }, { data: memberships, error: staffError }] = await Promise.all([
      db.from("user_roles").select("role").eq("user_id", actor.id),
      db.from("staff").select("status").eq("user_id", actor.id),
    ]);
    if (roleError || staffError) throw new Error("Unable to verify staff access");
    const active = !(memberships ?? []).some(member => member.status !== "active");
    const owner = canManageStaff((roles ?? []).map(row => row.role), active);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Invalid request" }, 400);
    if (body.action === "access") return reply({ owner });
    if (!owner) return reply({ error: "Only the clinic owner can manage staff access and view staff activity" }, 403);
    if (body.action === "list") {
      const [{ data: staff, error }, { data: branches, error: branchError }, { data: assigned, error: assignedError }] = await Promise.all([
        db.from("staff").select("*").order("name"),
        db.from("branches").select("id,name").eq("is_active", true).order("name"),
        db.from("user_roles").select("user_id,role"),
      ]);
      if (error || branchError || assignedError) throw new Error("Unable to load staff");
      return reply({ staff, branches, roles: assigned });
    }
    if (body.action === "activity") {
      if (typeof body.staff_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.staff_id)) return reply({ error: "Select a staff member" }, 400);
      const { data: staff, error } = await db.from("staff").select("user_id,email").eq("id", body.staff_id).single();
      if (error || !staff) return reply({ error: "Staff member not found" }, 404);
      let query = db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      query = staff.user_id ? query.eq("actor_id", staff.user_id) : query.eq("actor_email", staff.email ?? "");
      const { data: events, error: auditError } = await query;
      if (auditError) throw new Error("Unable to load activity");
      const { data: changes, error: changesError } = await db.from("audit_logs").select("*").eq("entity", "staff").eq("entity_id", body.staff_id).order("created_at", { ascending: false }).limit(50);
      if (changesError) throw new Error("Unable to load access changes");
      return reply({ events, changes });
    }
    if (body.action !== "save") return reply({ error: "Unknown action" }, 400);
    const problem = validateStaffChange(body);
    if (problem) return reply({ error: problem }, 400);
    const email = body.email.trim().toLowerCase();
    let target: { id: string; email_confirmed_at?: string } | undefined;
    // Find the exact existing login; never create or auto-confirm a staff account.
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Unable to find staff login");
      target = data.users.find(user => user.email?.toLowerCase() === email);
      if (target || data.users.length < 200) break;
    }
    if (target && !target.email_confirmed_at) return reply({ error: "This staff member must verify their login email first" }, 400);
    const { data: id, error } = await db.rpc("save_staff_assignment", {
      _actor: actor.id, _id: body.id ?? null, _user: target?.id ?? null,
      _name: body.name.trim(), _email: email, _phone: body.phone ?? "",
      _role: body.role, _status: body.status, _branch: body.branch_id ?? null, _reason: body.reason.trim(),
    });
    if (error) return reply({ error: error.message }, 400);
    return reply({ id, linked: !!target, message: target ? "Staff access updated" : "Staff saved. Login access starts after their email account is verified and linked." });
  } catch {
    return reply({ error: "Unable to complete staff request. Please try again." }, 500);
  }
});