import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  createDocumentTemplate, DOCUMENT_TEMPLATE, isConfigured, isWindowOpen, listApprovedTemplates,
  logMessage, sendDocument, sendDocumentTemplate,
} from "../_shared/whatsapp.ts";
import { invoicePdf, prescriptionPdf } from "../_shared/patient-pdf.ts";

const Body = z.object({ kind: z.enum(["invoice", "prescription"]), id: z.string().uuid() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in to continue" }, 401);
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: who } = await asUser.auth.getUser(token);
    if (!who?.user) return json({ error: "Sign in to continue" }, 401);
    const { data: staff } = await asUser.rpc("is_staff");
    if (staff !== true) return json({ error: "Only clinic staff can send documents" }, 403);
    if (!isConfigured()) return json({ error: "WhatsApp is not configured." }, 500);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const { kind, id } = parsed.data;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: s } = await db.from("clinic_settings").select("clinic_name,primary_phone,address,gstin").limit(1).maybeSingle();
    const clinic = {
      name: s?.clinic_name ?? "Tooth Haven Advanced Dental Care",
      address: s?.address ?? "West Mambalam, Chennai 600033",
      phone: s?.primary_phone ?? "+91 89251 66149",
      gstin: s?.gstin,
    };

    const table = kind === "invoice" ? "invoices" : "prescriptions";
    const { data: rec } = await db.from(table).select("*").eq("id", id).maybeSingle();
    if (!rec) return json({ error: "Record not found" }, 404);
    const { data: patient } = await db.from("patients").select("id,name,phone,patient_code,whatsapp_opt_out").eq("id", rec.patient_id).maybeSingle();
    if (!patient?.phone) return json({ error: "This patient has no mobile number" }, 400);
    if (patient.whatsapp_opt_out) return json({ error: "This patient has opted out of WhatsApp messages" }, 409);

    let pdf: Uint8Array, label: string, filename: string;
    if (kind === "invoice") {
      const { data: items } = await db.from("invoice_items").select("*").eq("invoice_id", id).order("created_at");
      pdf = await invoicePdf(clinic, rec, patient, items ?? []);
      label = `invoice ${rec.invoice_number}`;
      filename = `ToothHaven-Invoice-${rec.invoice_number}.pdf`;
    } else {
      pdf = await prescriptionPdf(clinic, rec, patient);
      label = `prescription dated ${rec.prescribed_date}`;
      filename = `ToothHaven-Prescription-${rec.prescribed_date}.pdf`;
    }
    filename = filename.replace(/[^A-Za-z0-9._-]/g, "-");

    const path = `documents/${patient.id}/${kind}-${id}-${Date.now()}.pdf`;
    const up = await db.storage.from("patient-media").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) return json({ error: "Could not store the PDF" }, 500);
    const { data: signed } = await db.storage.from("patient-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (!signed?.signedUrl) return json({ error: "Could not prepare the PDF link" }, 500);

    const firstName = String(patient.name).replace(/^(mr|mrs|ms|master|dr)\.?\s+/i, "").split(/\s+/)[0] || "there";
    let via: "document" | "template";
    let result;
    if (await isWindowOpen(db, patient.phone)) {
      via = "document";
      result = await sendDocument(patient.phone, signed.signedUrl, filename, `Hello ${firstName}, your ${label} from Tooth Haven is attached.`);
    } else {
      const approved = await listApprovedTemplates(true);
      if (!approved.some((t) => t.name === DOCUMENT_TEMPLATE)) {
        const all = await listApprovedTemplates(true, true);
        const existing = all.find((t) => t.name === DOCUMENT_TEMPLATE);
        if (!existing) {
          const created = await createDocumentTemplate(pdf);
          return json({
            error: created.ok
              ? "The patient hasn't messaged the clinic in the last 24 hours, so WhatsApp needs an approved document message. It has been sent to Meta for approval; try again once approved."
              : `The patient hasn't messaged in the last 24 hours and the document message could not be submitted to Meta: ${created.error}`,
            template_pending: true,
          }, 409);
        }
        return json({ error: `The document message is ${String(existing.status).toLowerCase()} with Meta. It can be sent once Meta approves it, or right away if the patient messages the clinic first.`, template_pending: true }, 409);
      }
      via = "template";
      result = await sendDocumentTemplate(patient.phone, signed.signedUrl, filename, [firstName, label]);
    }
    if (!result.ok) return json({ error: result.error ?? "WhatsApp send failed" }, 502);

    await logMessage(db, {
      wa_message_id: result.id ?? null, direction: "outbound", phone: patient.phone,
      body: `[document] ${filename}`, message_type: via === "template" ? "template" : "document",
      template_name: via === "template" ? DOCUMENT_TEMPLATE : null, handled_by_staff: true, patient_id: patient.id,
    });
    await db.from("audit_logs").insert({ actor_id: who.user.id, actor_email: who.user.email, action: "document_sent_whatsapp", entity: table, entity_id: id, details: { via } });
    return json({ ok: true, via });
  } catch (e) {
    console.error("patient-document-send", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
