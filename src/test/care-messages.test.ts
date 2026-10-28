import { describe, it, expect } from "vitest";

const DAY = 86400000;
// Mirrors supabase/functions/_shared/care-messages.ts pure helpers.
function dueAtIst(date: string, offsetDays: number) { return new Date(new Date(`${date}T10:00:00+05:30`).getTime() + offsetDays * DAY); }
function recallDue(lastVisit: string, now: Date) { const age = now.getTime() - new Date(`${lastVisit}T00:00:00+05:30`).getTime(); return age >= 182 * DAY && age <= 274 * DAY; }

describe("care messages", () => {
  it("schedules post-op check-ins on day 1, 3 and 7 at 10:00 IST", () => {
    expect(dueAtIst("2026-10-01", 1).toISOString()).toBe("2026-10-02T04:30:00.000Z");
    expect(dueAtIst("2026-10-01", 3).toISOString()).toBe("2026-10-04T04:30:00.000Z");
    expect(dueAtIst("2026-10-01", 7).toISOString()).toBe("2026-10-08T04:30:00.000Z");
  });
  it("recalls only after six months", () => {
    const now = new Date("2026-10-28T10:00:00+05:30");
    expect(recallDue("2026-05-01", now)).toBe(false);
    expect(recallDue("2026-04-20", now)).toBe(true);
  });
});
