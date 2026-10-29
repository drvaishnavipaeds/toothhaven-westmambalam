import { describe, expect, it } from "vitest";
import { addMonths, buildInsights, insightMessage, monthsBetween } from "@/lib/patient-insights";

const today = "2026-10-29";
const p = (id: string, created_at = "2024-01-01") => ({ id, name: `Mrs. P${id}`, phone: "9876543210", created_at });
let n = 0;
const a = (patient_id: string, appointment_date: string, status: string) => ({ id: String(n++), patient_id, appointment_date, appointment_time: "10:00:00", status });

describe("patient insights", () => {
  it("handles month arithmetic at month ends", () => {
    expect(addMonths("2026-08-31", -6)).toBe("2026-02-28");
    expect(addMonths(today, -12)).toBe("2025-10-29");
    expect(monthsBetween("2026-04-30", today)).toBe(5);
  });

  it("flags upcoming bookings from patients who missed or cancelled before", () => {
    const { likelyToMiss } = buildInsights([p("1"), p("2"), p("3")], [
      a("1", "2026-10-31", "confirmed"), a("1", "2026-06-01", "confirmed"),
      a("2", "2026-11-02", "confirmed"), a("2", "2026-07-01", "cancelled"),
      a("3", "2026-11-01", "confirmed"), a("3", "2026-05-01", "completed"),
    ], today);
    expect(likelyToMiss.map((r) => [r.patient.id, r.level])).toEqual([["1", "high"], ["2", "medium"]]);
    expect(likelyToMiss[0].missed).toBe(1);
  });

  it("separates due-for-check-up from inactive and skips anyone already booked", () => {
    const { dueCheckup, inactive } = buildInsights([p("due"), p("old"), p("never"), p("newbie", "2026-09-01"), p("booked")], [
      a("due", "2026-03-10", "completed"),
      a("old", "2025-02-01", "completed"),
      a("booked", "2025-01-01", "completed"), a("booked", "2026-11-20", "pending"),
    ], today);
    expect(dueCheckup.map((r) => [r.patient.id, r.months])).toEqual([["due", 7]]);
    expect(inactive.map((r) => r.patient.id)).toEqual(["old", "never"]);
  });

  it("writes first-name messages", () => {
    expect(insightMessage("likely_to_miss", "Master J Sai Vishnav", { date: "2026-10-31", time: "10:30:00" })).toMatch(/^Hello Sai, .*2026-10-31 at 10:30/);
  });
});
