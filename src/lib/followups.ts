export type FollowupBucket = "overdue" | "today" | "tomorrow" | "week" | "later";
export type CallStatus = "not_called" | "no_answer" | "call_back" | "booked" | "not_interested";

export const BUCKET_LABEL: Record<FollowupBucket, string> = { overdue: "Overdue", today: "Today", tomorrow: "Tomorrow", week: "Next 7 days", later: "Later" };
export const CALL_STATUS_LABEL: Record<CallStatus, string> = { not_called: "Not called", no_answer: "No answer", call_back: "Call back", booked: "Booked", not_interested: "Not interested" };
export const FOLLOWUP_TYPES: Record<string, string> = {
  review: "Review", next_sitting: "Next sitting", post_op: "Post-op check", suture_removal: "Suture removal",
  ortho_adjustment: "Braces adjustment", rct_completion: "RCT completion", crown_fit: "Crown fitting", other: "Other",
};

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function followupBucket(due: string, today: string): FollowupBucket {
  if (due < today) return "overdue";
  if (due === today) return "today";
  if (due === addDays(today, 1)) return "tomorrow";
  return due <= addDays(today, 7) ? "week" : "later";
}

/** Call outcome → follow-up update. "Booked" closes the follow-up; "Not interested" cancels it. */
export function logCall(outcome: CallStatus, attempts: number, nowIso: string) {
  const status = outcome === "booked" ? "booked" : outcome === "not_interested" ? "cancelled" : "pending";
  return { call_status: outcome, call_attempts: attempts + 1, last_called_at: nowIso, status } as const;
}

export function followupMessage(o: { patientName: string; type: string; due: string }): string {
  const first = o.patientName.split(/[\s.]+/).find((w) => w.length > 1 && !/^(master|mr|mrs|ms|miss|dr|baby)$/i.test(w)) ?? "there";
  return `Hello ${first}, this is Tooth Haven Advanced Dental Care. Your ${(FOLLOWUP_TYPES[o.type] ?? o.type).toLowerCase()} is due on ${o.due}. Please reply to book a convenient time.`;
}

/** Indian mobile numbers become a wa.me target. */
export function whatsappTarget(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 ? digits : null;
}
