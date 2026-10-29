export interface InsightPatient { id: string; name: string; phone: string | null; whatsapp_opt_out?: boolean | null; created_at?: string | null }
export interface InsightAppointment { id: string; patient_id: string | null; appointment_date: string; appointment_time: string; status: string; treatment_type?: string | null }

export type InsightKind = "likely_to_miss" | "due_checkup" | "inactive";
export const INSIGHT_LABEL: Record<InsightKind, string> = { likely_to_miss: "Likely to miss", due_checkup: "Due for check-up", inactive: "Inactive" };

const BOOKED = new Set(["confirmed", "pending", "tentative"]);
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
const addDays = (iso: string, n: number) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const monthsBetween = (from: string, to: string) => {
  const [fy, fm, fd] = from.split("-").map(Number); const [ty, tm, td] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
};

export interface MissRisk { patient: InsightPatient; appointment: InsightAppointment; missed: number; cancelled: number; rescheduled: number; level: "high" | "medium" }
export interface LapsedPatient { patient: InsightPatient; lastVisit: string | null; months: number | null }

/**
 * Likely to miss: booked in the next 7 days and, in the past year, at least one missed (booked but never completed
 * after the date passed), cancelled or rescheduled appointment.
 * Due for check-up: last completed visit 6–12 months ago and nothing booked. Inactive: last visit over 12 months ago
 * (or never visited and registered over 12 months ago) and nothing booked.
 */
export function buildInsights(patients: InsightPatient[], appointments: InsightAppointment[], today: string) {
  const byPatient = new Map<string, InsightAppointment[]>();
  for (const a of appointments) if (a.patient_id) (byPatient.get(a.patient_id) ?? byPatient.set(a.patient_id, []).get(a.patient_id)!).push(a);
  const yearAgo = addMonths(today, -12), sixMonthsAgo = addMonths(today, -6), weekAhead = addDays(today, 7);

  const likelyToMiss: MissRisk[] = [], dueCheckup: LapsedPatient[] = [], inactive: LapsedPatient[] = [];
  for (const p of patients) {
    const appts = byPatient.get(p.id) ?? [];
    const upcoming = appts.filter((a) => a.appointment_date >= today && BOOKED.has(a.status)).sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time));
    const lastVisit = appts.filter((a) => a.status === "completed" && a.appointment_date <= today).reduce<string | null>((m, a) => (!m || a.appointment_date > m ? a.appointment_date : m), null);

    const next = upcoming.find((a) => a.status === "confirmed" && a.appointment_date <= weekAhead);
    if (next) {
      const pastYear = appts.filter((a) => a.appointment_date >= yearAgo && a.appointment_date < today);
      const missed = pastYear.filter((a) => BOOKED.has(a.status)).length;
      const cancelled = pastYear.filter((a) => a.status === "cancelled").length;
      const rescheduled = pastYear.filter((a) => a.status === "rescheduled").length;
      const score = missed * 2 + cancelled + rescheduled;
      if (score > 0) likelyToMiss.push({ patient: p, appointment: next, missed, cancelled, rescheduled, level: score >= 2 ? "high" : "medium" });
    }
    if (upcoming.length) continue;
    if (lastVisit && lastVisit <= sixMonthsAgo && lastVisit > yearAgo) dueCheckup.push({ patient: p, lastVisit, months: monthsBetween(lastVisit, today) });
    else if (lastVisit ? lastVisit <= yearAgo : (p.created_at ?? today).slice(0, 10) <= yearAgo) inactive.push({ patient: p, lastVisit, months: lastVisit ? monthsBetween(lastVisit, today) : null });
  }
  likelyToMiss.sort((a, b) => (a.level === b.level ? a.appointment.appointment_date.localeCompare(b.appointment.appointment_date) : a.level === "high" ? -1 : 1));
  dueCheckup.sort((a, b) => String(a.lastVisit).localeCompare(String(b.lastVisit)));
  inactive.sort((a, b) => String(b.lastVisit ?? "").localeCompare(String(a.lastVisit ?? "")));
  return { likelyToMiss, dueCheckup, inactive };
}

const firstName = (full: string) => full.split(/[\s.]+/).find((w) => w.length > 1 && !/^(master|mr|mrs|ms|miss|dr|baby)$/i.test(w)) ?? "there";
export function insightMessage(kind: InsightKind, name: string, appointment?: { date: string; time: string }): string {
  const hi = `Hello ${firstName(name)}, this is Tooth Haven Advanced Dental Care.`;
  if (kind === "likely_to_miss" && appointment) return `${hi} A reminder of your appointment on ${appointment.date} at ${appointment.time.slice(0, 5)}. Please reply YES to confirm, or let us know if you need another time.`;
  if (kind === "due_checkup") return `${hi} It has been about 6 months since your last visit, so you're due for a dental check-up and cleaning. Reply to book a convenient time.`;
  return `${hi} We haven't seen you in a while! Regular check-ups keep small problems from becoming big ones. Reply to book your visit.`;
}
