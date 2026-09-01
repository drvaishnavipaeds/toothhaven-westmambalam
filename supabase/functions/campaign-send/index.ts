import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  last10,
  listApprovedTemplates,
  logMessage,
  sendTemplate,
  toE164,
} from "../_shared/whatsapp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const BATCH = 20;
const GAP_MS = 250;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const launchSchema = z.object({
  action: z.literal("launch"),
  campaignId: z.string().uuid(),
  manualPhones: z.array(z.string().min(10).max(20)).max(2000).optional(),
});

async function requireStaff(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: staff } = await admin.from("admin_phones").select("id").ilike("email", email).maybeSingle();
  return staff ? email : null;
}

function isCron(req: Request): boolean {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  return token === SERVICE_KEY;
}

/** Resolves the patient list for a campaign audience. */
async function buildAudience(audience: string, manualPhones?: string[]) {
  if (audience === "manual") {
    return (manualPhones ?? []).map((p) => ({ id: null as string | null, name: null as string | null, phone: last10(p) }));
  }

  const { data: patients } = await admin
    .from("patients")
    .select("id, name, phone")
    .eq("whatsapp_opt_out", false);
  const all = (patients ?? []).filter((p) => last10(p.phone).length === 10);

  if (audience === "all") return all;

  if (audience === "inactive_6m") {
    const cutoff = new Date(Date.now() - 182 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: recent } = await admin
      .from("appointments")
      .select("patient_id")
      .gte("appointment_date", cutoff)
      .not("patient_id", "is", null);
    const seen = new Set((recent ?? []).map((r) => r.patient_id as string));
    return all.filter((p) => !seen.has(p.id));
  }

  if (audience === "plan_accepted") {
    const { data: plans } = await admin
      .from("treatment_plans")
      .select("patient_id")
      .eq("status", "accepted");
    const ids = new Set((plans ?? []).map((p) => p.patient_id as string));
    return all.filter((p) => ids.has(p.id));
  }

  return all;
}

function fillVariables(vars: unknown, patientName: string | null): string[] {
  const list = Array.isArray(vars) ? vars : [];
  return list.map((v) => String(v ?? "").replace(/\{\{\s*name\s*\}\}/gi, patientName ?? "there").slice(0, 400));
}

/** Sends up to BATCH queued rows across all sending campaigns. */
async function drain() {
  const nowIso = new Date().toISOString();

  // Promote scheduled campaigns whose time has come.
  await admin
    .from("campaigns")
    .update({ status: "sending" })
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso);

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, template_name, template_language, variables, sent_count, failed_count")
    .eq("status", "sending")
    .limit(5);

  let processed = 0;
  for (const campaign of campaigns ?? []) {
    const { data: recipients } = await admin
      .from("campaign_recipients")
      .select("id, phone, name, patient_id")
      .eq("campaign_id", campaign.id)
      .eq("status", "queued")
      .limit(BATCH - processed);

    if (!recipients?.length) {
      const { count: remaining } = await admin
        .from("campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "queued");
      if ((remaining ?? 0) === 0) {
        await admin.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
      }
      continue;
    }

    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const result = await sendTemplate({
        to: r.phone,
        name: campaign.template_name,
        language: campaign.template_language,
        bodyParams: fillVariables(campaign.variables, r.name),
      });

      if (result.ok) {
        sent++;
        await admin
          .from("campaign_recipients")
          .update({ status: "sent", wa_message_id: result.id ?? null, sent_at: new Date().toISOString(), error: null })
          .eq("id", r.id);
        await logMessage(admin, {
          wa_message_id: result.id ?? null,
          direction: "outbound",
          phone: r.phone,
          body: `[template] ${campaign.template_name}`,
          message_type: "template",
          template_name: campaign.template_name,
          campaign_id: campaign.id,
          patient_id: r.patient_id ?? null,
          handled_by_staff: true,
        });
      } else {
        failed++;
        await admin
          .from("campaign_recipients")
          .update({ status: "failed", error: result.error ?? "send failed" })
          .eq("id", r.id);
      }
      processed++;
      await new Promise((res) => setTimeout(res, GAP_MS));
      if (processed >= BATCH) break;
    }

    await admin
      .from("campaigns")
      .update({
        sent_count: (campaign.sent_count ?? 0) + sent,
        failed_count: (campaign.failed_count ?? 0) + failed,
      })
      .eq("id", campaign.id);

    if (processed >= BATCH) break;
  }

  return processed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const raw = await req.json().catch(() => ({}));

    // ---- Staff actions ----
    if (raw?.action === "templates") {
      if (!(await requireStaff(req))) return json({ error: "Not authorized" }, 403);
      const templates = await listApprovedTemplates(raw?.refresh === true);
      return json({ ok: true, templates });
    }

    if (raw?.action === "launch") {
      if (!(await requireStaff(req))) return json({ error: "Not authorized" }, 403);
      const parsed = launchSchema.safeParse(raw);
      if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

      const { data: campaign } = await admin
        .from("campaigns")
        .select("id, audience, status, scheduled_at")
        .eq("id", parsed.data.campaignId)
        .maybeSingle();
      if (!campaign) return json({ error: "Campaign not found" }, 404);
      if (campaign.status !== "draft") return json({ error: "Campaign has already been launched" }, 409);

      const audience = await buildAudience(campaign.audience, parsed.data.manualPhones);
      const unique = new Map<string, { id: string | null; name: string | null; phone: string }>();
      for (const p of audience) if (p.phone) unique.set(p.phone, p);
      const rows = [...unique.values()].map((p) => ({
        campaign_id: campaign.id,
        patient_id: p.id,
        phone: toE164(p.phone),
        name: p.name,
      }));

      if (!rows.length) return json({ error: "No recipients matched this audience" }, 400);

      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await admin.from("campaign_recipients").insert(rows.slice(i, i + 500));
        if (error) return json({ error: error.message }, 500);
      }

      const scheduled = campaign.scheduled_at && new Date(campaign.scheduled_at).getTime() > Date.now();
      await admin
        .from("campaigns")
        .update({ status: scheduled ? "scheduled" : "sending", total_count: rows.length })
        .eq("id", campaign.id);

      // Kick off immediately so staff see progress right away.
      if (!scheduled) {
        // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(drain());
      }
      return json({ ok: true, queued: rows.length, status: scheduled ? "scheduled" : "sending" });
    }

    if (raw?.action === "audience_count") {
      if (!(await requireStaff(req))) return json({ error: "Not authorized" }, 403);
      const audience = String(raw?.audience ?? "all");
      const list = await buildAudience(audience, raw?.manualPhones);
      return json({ ok: true, count: new Set(list.map((p) => p.phone)).size });
    }

    // ---- Cron drain ----
    if (!isCron(req)) return json({ error: "Not authorized" }, 401);
    const processed = await drain();
    return json({ ok: true, processed });
  } catch (e) {
    console.error("campaign-send error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
