import { describe, expect, it } from "vitest";
import { isOverdue, matchesFilter, monthlyLabBills, whatsappTarget, workOrderText } from "@/lib/lab-cases";

const today = "2026-10-29";
const c = (o: Partial<{ status: string; due_date: string | null; sent_on: string | null; cost: number; lab_id: string | null }>) =>
  ({ status: "sent", due_date: null, sent_on: null, cost: 0, lab_id: "l1", ...o });

describe("lab case status", () => {
  it("is overdue only while the work is at the lab", () => {
    expect(isOverdue(c({ due_date: "2026-10-28" }), today)).toBe(true);
    expect(isOverdue(c({ status: "rework", due_date: "2026-10-01" }), today)).toBe(true);
    expect(isOverdue(c({ status: "received", due_date: "2026-10-01" }), today)).toBe(false);
    expect(isOverdue(c({ due_date: today }), today)).toBe(false);
  });
  it("filters open and delivered cases", () => {
    expect(matchesFilter(c({ status: "impression" }), "open", today)).toBe(true);
    expect(matchesFilter(c({ status: "delivered" }), "open", today)).toBe(false);
    expect(matchesFilter(c({ status: "cancelled" }), "at_lab", today)).toBe(false);
  });
});

describe("monthlyLabBills", () => {
  it("totals cases sent in the month per lab, skipping cancelled", () => {
    const bills = monthlyLabBills([
      c({ sent_on: "2026-10-03", cost: 2500 }), c({ sent_on: "2026-10-20", cost: 1800.5 }),
      c({ sent_on: "2026-10-21", cost: 900, status: "cancelled" }), c({ sent_on: "2026-09-30", cost: 700 }),
      c({ sent_on: "2026-10-05", cost: 400, lab_id: "l2" }),
    ], "2026-10");
    expect(bills.get("l1")).toEqual({ cases: 2, total: 4300.5 });
    expect(bills.get("l2")).toEqual({ cases: 1, total: 400 });
  });
});

describe("work order", () => {
  it("lists only the filled-in details", () => {
    const text = workOrderText({ labName: "Smile Lab", patientName: "Mrs. Lavanya", workType: "Zirconia crown", teeth: "36", shade: "A2", dueDate: "2026-11-05" });
    expect(text).toContain("Work: Zirconia crown");
    expect(text).toContain("Tooth: 36");
    expect(text).not.toContain("Material:");
  });
  it("normalises Indian WhatsApp numbers", () => {
    expect(whatsappTarget("98765 43210")).toBe("919876543210");
    expect(whatsappTarget("+91 98765-43210")).toBe("919876543210");
    expect(whatsappTarget("12345")).toBeNull();
  });
});
