export interface QueueAppointment {
  id: string; patient_name: string; appointment_time: string; status: string; chair_id: string | null;
  checked_in_at: string | null; seated_at: string | null; treatment_type?: string | null;
}
export type QueueStage = "expected" | "waiting" | "in_chair" | "done";

export function queueStage(a: QueueAppointment): QueueStage {
  if (a.status === "completed") return "done";
  if (a.seated_at && a.chair_id) return "in_chair";
  if (a.checked_in_at) return "waiting";
  return "expected";
}

const byTime = (a: QueueAppointment, b: QueueAppointment) => a.appointment_time.localeCompare(b.appointment_time);
const byArrival = (a: QueueAppointment, b: QueueAppointment) => String(a.checked_in_at).localeCompare(String(b.checked_in_at)) || byTime(a, b);

/** Live queue for one day: who is in each chair, who has arrived (in arrival order), and who is still expected. */
export function buildBoard(appointments: QueueAppointment[]) {
  const live = appointments.filter((a) => a.status === "confirmed" || a.status === "completed");
  const inChair = new Map<string, QueueAppointment>();
  for (const a of live.filter((x) => queueStage(x) === "in_chair").sort((x, y) => String(y.seated_at).localeCompare(String(x.seated_at)))) {
    if (!inChair.has(a.chair_id!)) inChair.set(a.chair_id!, a);
  }
  return {
    inChair,
    waiting: live.filter((a) => queueStage(a) === "waiting").sort(byArrival),
    expected: live.filter((a) => queueStage(a) === "expected").sort(byTime),
    done: live.filter((a) => queueStage(a) === "done").length,
  };
}

/** Waiting-room screens show a privacy-safe name: "Master J Sai Vishnav" → "Sai V.", "Mrs. Lavanya" → "Lavanya". */
const TITLES = new Set(["master", "mr", "mrs", "ms", "miss", "dr", "baby", "kum", "selvi", "thiru", "tmt", "smt", "sri", "shri", "mx"]);
export function displayName(full: string): string {
  const words = full.split(/[\s.]+/).filter((w) => w && !TITLES.has(w.toLowerCase()) && w.replace(/[^a-z]/gi, "").length > 1);
  if (words.length === 0) return "Patient";
  return words.length > 1 ? `${words[0]} ${words[words.length - 1][0].toUpperCase()}.` : words[0];
}

export function minutesSince(iso: string | null, now: Date): number {
  return iso ? Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)) : 0;
}
