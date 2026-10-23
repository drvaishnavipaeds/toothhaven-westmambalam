import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createMessageTemplate, editMessageTemplate, listManagedTemplates } from "../_shared/whatsapp.ts";
import { mayEditTemplate, sameTemplateVariables, validateTemplate, type TemplateInput } from "../_shared/template-validation.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Sign in to continue" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key || !publicKey) return reply({ error: "Template service unavailable" }, 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error } = await db.auth.getUser(token);
    if (error || !identity.user) return reply({ error: "Sign in to continue" }, 401);
    const actor = identity.user;
    // is_staff evaluates the actual bearer identity, including inactive linked staff.
    const session = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: staff, error: staffError } = await session.rpc("is_staff");
    if (staffError || !staff) return reply({ error: "Clinic staff access required" }, 403);
    const { data: roles, error: rolesError } = await db.from("user_roles").select("role").eq("user_id", actor.id);
    if (rolesError) throw new Error("Unable to verify template permissions");
    const canManage = roles?.some(row => row.role === "owner") === true;
    const raw = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !["list", "create", "edit"].includes(raw.action)) return reply({ error: "Invalid template action" }, 400);
    if (raw.action === "list") return reply({ templates: await listManagedTemplates(), canManage });
    if (!canManage) return reply({ error: "Only the clinic owner can change messaging templates" }, 403);
    if (!["name", "language", "category", "body"].every(k => typeof raw[k] === "string") || !Array.isArray(raw.examples) || !raw.examples.every((e: unknown) => typeof e === "string")) return reply({ error: "Invalid template fields" }, 400);
    const input: TemplateInput = { name: raw.name, language: raw.language, category: raw.category, body: raw.body, examples: raw.examples };
    const problem = validateTemplate(input);
    if (problem) return reply({ error: problem }, 400);
    let result;
    if (raw.action === "create") {
      result = await createMessageTemplate({ ...input, category: input.category as "UTILITY" | "MARKETING" });
    } else {
      if (typeof raw.id !== "string" || !/^\d+$/.test(raw.id)) return reply({ error: "Select an existing template" }, 400);
      // Resolve against the configured business account, not an arbitrary caller-supplied ID.
      const template = (await listManagedTemplates()).find(t => t.id === raw.id);
      if (!template) return reply({ error: "Template not found in this clinic account" }, 404);
      if (!mayEditTemplate(template)) return reply({ error: "This template is currently read-only. Create a new version instead." }, 409);
      if (template.name !== input.name || template.language !== input.language || template.category !== input.category) return reply({ error: "Name, language and category cannot change during editing" }, 400);
      const body = template.components?.find(c => typeof c === "object" && c !== null && "type" in c && c.type === "BODY") as { text: string } | undefined;
      if (!body || !sameTemplateVariables(body.text, input.body)) return reply({ error: "Keep the existing variables so appointment and campaign messages continue to work. Create a new template for different variables." }, 400);
      const components = template.components?.map(c => {
        if (typeof c !== "object" || c === null || !("type" in c) || c.type !== "BODY") return c;
        const { example: _example, ...rest } = c as Record<string, unknown>;
        return { ...rest, text: input.body, ...(input.examples.length ? { example: { body_text: [input.examples] } } : {}) };
      }) ?? [];
      result = await editMessageTemplate(raw.id, components);
    }
    if (!result.ok) return reply({ error: result.error ?? "Meta did not accept this template" }, 400);
    const { error: auditError } = await db.from("audit_logs").insert({ actor_id: actor.id, actor_email: actor.email, action: `message_template_${raw.action}`, entity: "whatsapp_templates", entity_id: result.id ?? input.name, details: { name: input.name, language: input.language } });
    return reply({ ok: true, id: result.id, message: `Template submitted to Meta. Approval is required before sending.${auditError ? " Activity recording failed; refresh before retrying." : ""}` });
  } catch (e) { return reply({ error: e instanceof Error ? e.message : "Unable to manage templates" }, 500); }
});