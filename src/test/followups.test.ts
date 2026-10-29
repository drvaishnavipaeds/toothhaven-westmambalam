import { describe, expect, it } from "vitest";
import { addDays, followupBucket, followupMessage, logCall } from "@/lib/followups";

describe("follow-ups", () => {
  const today = "2026-10-31";
  it("buckets due dates like the front-desk worklist", () => {
    expect(followupBucket("2026-10-30", today)).toBe("overdue");
    expect(followupBucket(today, today)).toBe("today");
    expect(followupBucket("2026-11-01", today)).toBe("tomorrow");
    expect(followupBucket("2026-11-07", today)).toBe("week");
    expect(followupBucket("2026-11-08", today)).toBe("later");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("closes or keeps the follow-up based on the call outcome", () => {
    expect(logCall("no_answer", 1, "t")).toEqual({ call_status: "no_answer", call_attempts: 2, last_called_at: "t", status: "pending" });
    expect(logCall("booked", 0, "t").status).toBe("booked");
    expect(logCall("not_interested", 0, "t").status).toBe("cancelled");
  });
  it("greets by first name without titles", () => {
    expect(followupMessage({ patientName: "Master J Sai Vishnav", type: "next_sitting", due: "2026-11-02" })).toMatch(/^Hello Sai, .*next sitting is due on 2026-11-02/);
  });
});
