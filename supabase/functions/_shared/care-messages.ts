// Automated preventive recalls and post-treatment check-ins.
// Rows are queued idempotently (unique kind+source_key), atomically claimed before
// sending, and held in the queue until the matching Meta template is APPROVED.
import { createMessageTemplate, listApprovedTemplates, logMessage, sendTemplate } from "./whatsapp.ts";

export const RECALL_TEMPLATE = "th_recall_6m_v1";
export const POSTOP_TEMPLATE = "th_postop_checkin_v1";
const DAY = 86400000;
const MAX_ATTEMPTS = 3;
const BATCH = 25;

export const CARE_TEMPLATES = [
  {
    name: RECALL_TEMPLATE, category: "UTILITY" as const, language: "en_US",
    body: "Hello {{1}}, it has been about six months since your last visit to Tooth Haven. A routine check-up and cleaning helps keep your teeth and gums healthy. Reply to this message or book online at toothhaven.in to choose a convenient time. Reply STOP to opt out.",
    examples: ["Priya"],
  },
  {
    name: POSTOP_TEMPLATE, category: "UTILITY" as const, language: "en_US",
    body: "Hello {{1}}, this is Tooth Haven checking in on day {{2}} after your {{3}}. How are you feeling? Please reply with any pain, swelling or bleeding and Dr. Karthik's team will guide you. For severe pain or swelling, call 8925166149 right away.",
    examples: ["Priya", "3", "root canal treatment"],
  },
];

/** 10:00 IST on the given date plus offset days. */
export function dueAtIst(date: string, offsetDays: number): Date {
  return new Date(new Date(`${date}T10:00:00+05:30`).getTime() + offsetDays * DAY);
}

/** Last visit qualifies for a recall when it is 6–9 months old (older lapsed patients are left to campaigns). */
export function recallDue(lastVisit: string, now: Date): boolean {
  const age = now.getTime() - new Date(`${lastVisit}T00:00:00+05:30`).getTime();
  return age >= 182 * DAY && age <= 274 * DAY;
}

export async function submitCareTemplates() {
  const existing = new Set((await listApprovedTemplates(true, true)).map((t) => t.name));
  const out: Record<string, unknown> = {};
  for (const t of CARE_TEMPLATES) out[t.name] = existing.has(t.name) ? { ok: true, existing: true } : await createMessageTemplate(t);
  return out;
}

async function enqueue(admin: any, now: Date) {
  const since = new Date(now.getTime() - 8 * DAY).toISOString().slice(0, 10);
  const rows: any[] = [];
  const { data: done } = await admin.from("treatments").select("id, patient_id, treatment_name, treatment_date")
    .eq("status", "completed").gte("treatment_date", since).not("patient_id", "is", null);
  for (const t of done ?? []) {
    for (const d of [1, 3, 7]) {
      const due = dueAtIst(t.treatment_date, d);
      if (due.getTime() < now.getTime() - DAY) continue; // never send stale check-ins
      rows.push({ patient_id: t.patient_id, kind: `postop_d${d}`, source_key: t.id, treatment_name: t.treatment_name, due_at: due.toISOString(), template_name: POSTOP_TEMPLATE });
    }
  }
  // Recalls: latest completed visit (treatment or appointment) 6–9 months ago, no upcoming booking.
  const lo = new Date(now.getTime() - 274 * DAY).toISOString().slice(0, 10);
  const hi = new Date(now.getTime() - 182 * DAY).toISOString().slice(0, 10);
  const last = new Map<string, string>();
  const [{ data: tr }, { data: ap }] = await Promise.all([
    admin.from("treatments").select("patient_id, treatment_date").eq("status", "completed").gte("treatment_date", lo).not("patient_id", "is", null),
    admin.from("appointments").select("patient_id, appointment_date").eq("status", "completed").gte("appointment_date", lo).not("patient_id", "is", null),
  ]);
  for (const r of [...(tr ?? []).map((x: any) => [x.patient_id, x.treatment_date]), ...(ap ?? []).map((x: any) => [x.patient_id, x.appointment_date])]) {
    if (r[1] && (!last.has(r[0]) || last.get(r[0])! < r[1])) last.set(r[0], r[1]);
  }
  const candidates = [...last.entries()].filter(([, d]) => d <= hi && recallDue(d, now));
  if (candidates.length) {
    const today = now.toISOString().slice(0, 10);
    const { data: upcoming } = await admin.from("appointments").select("patient_id").in("patient_id", candidates.map(([p]) => p))
      .gte("appointment_date", today).in("status", ["pending", "tentative", "confirmed", "rescheduled"]);
    const busy = new Set((upcoming ?? []).map((u: any) => u.patient_id));
    for (const [pid, d] of candidates) if (!busy.has(pid)) rows.push({ patient_id: pid, kind: "recall_6m", source_key: `${pid}:${d}`, due_at: now.toISOString(), template_name: RECALL_TEMPLATE });
  }
  if (rows.length) await admin.from("patient_care_messages").upsert(rows, { onConflict: "kind,source_key", ignoreDuplicates: true });
  return rows.length;
}

export async function runCareMessages(admin: any, now = new Date()) {
  const queued = await enqueue(admin, now).catch((e) => { console.error("care enqueue failed", e); return 0; });
  const approved = new Set((await listApprovedTemplates()).map((t) => t.name));
  const { data: due } = await admin.from("patient_care_messages").select("*, patients(name, phone, whatsapp_opt_out)")
    .eq("status", "queued").lte("due_at", now.toISOString()).order("due_at").limit(BATCH);
  let sent = 0, waiting = 0, skipped = 0;
  for (const row of due ?? []) {
    if (!approved.has(row.template_name)) { waiting++; continue; } // hold until Meta approves
    const p = row.patients;
    const stale = row.kind.startsWith("postop") && new Date(row.due_at).getTime() < now.getTime() - 2 * DAY;
    if (!p?.phone || p.whatsapp_opt_out || stale) {
      await admin.from("patient_care_messages").update({ status: "skipped", last_error: stale ? "Check-in window passed" : "No phone or opted out", updated_at: now.toISOString() }).eq("id", row.id).eq("status", "queued");
      skipped++; continue;
    }
    const { data: claimed } = await admin.from("patient_care_messages").update({ status: "sending", attempts: row.attempts + 1, updated_at: now.toISOString() })
      .eq("id", row.id).eq("status", "queued").select("id").maybeSingle();
    if (!claimed) continue;
    const name = (p.name ?? "there").split(" ")[0] || "there";
    const params = row.kind === "recall_6m" ? [name] : [name, row.kind.replace("postop_d", ""), row.treatment_name || "treatment"];
    const res = await sendTemplate({ to: p.phone, name: row.template_name, bodyParams: params });
    if (res.ok) {
      await admin.from("patient_care_messages").update({ status: "sent", sent_at: now.toISOString(), wa_message_id: res.id ?? null, last_error: null, updated_at: now.toISOString() }).eq("id", row.id);
      await logMessage(admin, { direction: "outbound", phone: p.phone, body: `[${row.kind}] ${row.template_name}`, message_type: "template", template_name: row.template_name, patient_id: row.patient_id, wa_message_id: res.id ?? null });
      sent++;
    } else {
      // Only definite failures return here; retry up to MAX_ATTEMPTS.
      const final = row.attempts + 1 >= MAX_ATTEMPTS;
      await admin.from("patient_care_messages").update({ status: final ? "failed" : "queued", last_error: res.error ?? "Send failed", updated_at: now.toISOString() }).eq("id", row.id);
    }
  }
  return { queued, sent, waiting, skipped };
}
