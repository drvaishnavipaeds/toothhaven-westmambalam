export type LabStatus = "impression" | "sent" | "received" | "delivered" | "rework" | "cancelled";
export interface LabCaseLike {
  status: LabStatus | string; due_date: string | null; sent_on: string | null; cost: number | string | null; lab_id: string | null;
}

export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  impression: "Impression taken", sent: "At lab", received: "Received", delivered: "Delivered", rework: "Rework at lab", cancelled: "Cancelled",
};
export const LAB_WORK_TYPES = ["PFM crown", "Zirconia crown", "E-max crown", "Bridge", "Complete denture", "Partial denture", "Cast partial denture", "Night guard", "Retainer", "Aligner", "Inlay / onlay", "Implant crown", "Post & core", "Other"];

const AT_LAB: string[] = ["sent", "rework"];
export const isOpen = (c: Pick<LabCaseLike, "status">) => !["delivered", "cancelled"].includes(c.status);
export const isAtLab = (c: Pick<LabCaseLike, "status">) => AT_LAB.includes(c.status);
/** Only work still at the lab can be overdue. */
export const isOverdue = (c: Pick<LabCaseLike, "status" | "due_date">, today: string) => isAtLab(c) && !!c.due_date && c.due_date < today;

export type LabFilter = "all" | "open" | "overdue" | "at_lab" | "received" | "delivered";
export function matchesFilter(c: LabCaseLike, filter: LabFilter, today: string): boolean {
  switch (filter) {
    case "open": return isOpen(c);
    case "overdue": return isOverdue(c, today);
    case "at_lab": return isAtLab(c);
    case "received": return c.status === "received";
    case "delivered": return c.status === "delivered";
    default: return true;
  }
}

/** Monthly bill per lab: cases sent in the month (cancelled excluded). */
export function monthlyLabBills(cases: LabCaseLike[], month: string): Map<string, { cases: number; total: number }> {
  const bills = new Map<string, { cases: number; total: number }>();
  for (const c of cases) {
    if (!c.lab_id || !c.sent_on?.startsWith(month) || c.status === "cancelled") continue;
    const b = bills.get(c.lab_id) ?? { cases: 0, total: 0 };
    b.cases += 1; b.total = Math.round((b.total + Number(c.cost ?? 0)) * 100) / 100;
    bills.set(c.lab_id, b);
  }
  return bills;
}

export function workOrderText(o: {
  labName: string; patientName: string; workType: string; teeth?: string | null; shade?: string | null; material?: string | null;
  instructions?: string | null; dueDate?: string | null; doctorName?: string | null; rework?: boolean;
}): string {
  return [
    `${o.rework ? "REWORK – " : ""}Lab work order from Tooth Haven Advanced Dental Care`,
    `Lab: ${o.labName}`,
    `Patient: ${o.patientName}`,
    `Work: ${o.workType}`,
    o.teeth ? `Tooth: ${o.teeth}` : "",
    o.shade ? `Shade: ${o.shade}` : "",
    o.material ? `Material: ${o.material}` : "",
    o.dueDate ? `Needed by: ${o.dueDate}` : "",
    o.doctorName ? `Doctor: ${o.doctorName}` : "",
    o.instructions ? `Instructions: ${o.instructions}` : "",
  ].filter(Boolean).join("\n");
}

/** Indian mobile numbers become a wa.me target; anything else is passed through as digits. */
export function whatsappTarget(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits.length >= 11 ? digits : null;
}
