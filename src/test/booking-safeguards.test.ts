import { describe, expect, it } from "vitest";
import { patientBookingEntry } from "../../supabase/functions/_shared/booking-entry";
import { calendarBusyPeriods } from "../../supabase/functions/_shared/calendar-availability";

describe("chat booking entry", () => {
  it("directs patients to verified booking without claiming a reservation", () => {
    const result = patientBookingEntry();
    expect(result.bookingCreated).toBe(false);
    expect(result.bookingUrl).toBe("https://www.toothhaven.in/patient-portal");
    expect(result.message).toContain("No appointment has been created or reserved");
    expect(result).not.toHaveProperty("id");
  });
});

describe("calendar fail-closed availability", () => {
  it("accepts genuinely empty busy periods", () => {
    expect(calendarBusyPeriods({ calendars: { primary: { busy: [] } } })).toEqual([]);
  });
  it.each([null, {}, { calendars: {} }, { calendars: { primary: {} } },
    { calendars: { primary: { busy: [], errors: [{ reason: "notFound" }] } } },
    { calendars: { primary: { busy: [{ start: "invalid", end: "invalid" }] } } },
    { calendars: { primary: { busy: [{ start: "2026-10-09T12:00:00Z", end: "2026-10-09T11:00:00Z" }] } } },
  ])("rejects unavailable or malformed calendar results %#", (response) => {
    expect(() => calendarBusyPeriods(response)).toThrow();
  });
  it("preserves verified busy intervals", () => {
    const busy = [{ start: "2026-10-09T05:30:00Z", end: "2026-10-09T06:00:00Z" }];
    expect(calendarBusyPeriods({ calendars: { primary: { busy } } })).toEqual(busy);
  });
});