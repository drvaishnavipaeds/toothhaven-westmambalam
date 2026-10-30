import { describe, expect, it } from "vitest";
import { calculateSalary, monthRange, summarizeWork } from "@/lib/salary";

describe("monthRange", () => {
  it("returns an exclusive month window", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", end: "2026-11-01" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("summarizeWork", () => {
  it("adds collections per doctor and counts distinct patients", () => {
    const work = summarizeWork(
      [{ doctor_id: "d1", amount_paid: 1000 }, { doctor_id: "d1", amount_paid: "500.5" }, { doctor_id: null, amount_paid: 900 }],
      [{ doctor_id: "d1", patient_id: "p1" }, { doctor_id: "d1", patient_id: "p1" }, { doctor_id: "d2", patient_id: "p2" }, { doctor_id: null, patient_id: "p3" }],
    );
    expect(work.get("d1")).toEqual({ collected: 1500.5, treatments: 2, patients: 1 });
    expect(work.get("d2")).toEqual({ collected: 0, treatments: 1, patients: 1 });
    expect(work.size).toBe(2);
  });
});

describe("calculateSalary", () => {
  const work = { collected: 40000, treatments: 12, patients: 9 };
  it("fixed pay ignores collections", () => {
    expect(calculateSalary({ pay_type: "fixed", fixed_monthly: 25000, commission_percent: 30 }, work)).toMatchObject({ fixed_pay: 25000, commission: 0, net_pay: 25000 });
  });
  it("commission pays a share of what was collected", () => {
    expect(calculateSalary({ pay_type: "commission", fixed_monthly: 25000, commission_percent: 30 }, work)).toMatchObject({ fixed_pay: 0, commission: 12000, net_pay: 12000 });
  });
  it("hybrid adds both, with bonus and deductions", () => {
    expect(calculateSalary({ pay_type: "hybrid", fixed_monthly: 15000, commission_percent: 12.5 }, work, { bonus: 1000, deductions: 500 }).net_pay).toBe(20500);
  });
});
