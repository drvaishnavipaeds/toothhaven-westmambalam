import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  findPatientId,
  isConfigured,
  isWindowOpen,
  listApprovedTemplates,
  logMessage,
  sendTemplate,
  sendText,
} from "../_shared/whatsapp.ts";

const bodySchema = z.object({
  phone: z.string().min(10).max(20),
  message: z.string().min(1).max(4000).optional(),
  templateName: z.string().min(1).max(120).optional(),
  templateLanguage: z.string().min(2).max(10).optional(),
  variables: z.array(z.string().max(400)).max(10).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (!isConfigured()) return json({ error: "WhatsApp is not configured." }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);
    const { data: userRes } = await admin.auth.getUser(token);
    const email = userRes?.user?.email?.toLowerCase();
    if (!email) return json({ error: "Not authenticated" }, 401);
    const { data: staffRow } = await admin.from("admin_phones").select("id").ilike("email", email).maybeSingle();
    if (!staffRow) return json({ error: "Not authorized" }, 403);

    const raw = await req.json().catch(() => ({}));

    // Approved templates for the inbox picker.
    if (raw?.action === "templates") {
      const templates = await listApprovedTemplates(raw?.refresh === true);
      return json({ ok: true, templates });
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { phone, message, templateName, templateLanguage, variables } = parsed.data;

    const windowOpen = await isWindowOpen(admin, phone);
    const useTemplate = Boolean(templateName) || !windowOpen;

    if (useTemplate && !templateName) {
      return json(
        {
          error:
            "This patient has not messaged in the last 24 hours, so WhatsApp only allows an approved template. Pick one from the template list.",
          template_required: true,
        },
        409,
      );
    }
    if (!useTemplate && !message) return json({ error: "Message is required" }, 400);

    const result = useTemplate
      ? await sendTemplate({
          to: phone,
          name: templateName!,
          language: templateLanguage,
          bodyParams: variables ?? [],
        })
      : await sendText(phone, message!);

    if (!result.ok) return json({ error: result.error ?? "WhatsApp send failed", code: result.code }, 502);

    await logMessage(admin, {
      wa_message_id: result.id ?? null,
      direction: "outbound",
      phone,
      body: useTemplate ? `[template] ${templateName}${variables?.length ? ` — ${variables.join(" | ")}` : ""}` : message!,
      message_type: useTemplate ? "template" : "text",
      template_name: useTemplate ? templateName : null,
      handled_by_staff: true,
      patient_id: await findPatientId(admin, phone),
    });

    return json({ ok: true });
  } catch (e) {
    console.error("whatsapp-send error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
