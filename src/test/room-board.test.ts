import { describe, expect, it } from "vitest";
import { buildBoard, displayName, minutesSince, queueStage, type QueueAppointment } from "@/lib/room-board";

const appt = (o: Partial<QueueAppointment>): QueueAppointment => ({ id: Math.random().toString(), patient_name: "X", appointment_time: "10:00", status: "confirmed", chair_id: null, checked_in_at: null, seated_at: null, ...o });

describe("room board", () => {
  it("derives the stage from check-in and seating", () => {
    expect(queueStage(appt({}))).toBe("expected");
    expect(queueStage(appt({ checked_in_at: "2026-10-29T04:00:00Z" }))).toBe("waiting");
    expect(queueStage(appt({ checked_in_at: "x", seated_at: "y", chair_id: "c1" }))).toBe("in_chair");
    expect(queueStage(appt({ status: "completed", seated_at: "y", chair_id: "c1" }))).toBe("done");
  });
  it("orders waiting patients by arrival and skips unconfirmed bookings", () => {
    const board = buildBoard([
      appt({ id: "late", appointment_time: "09:00", checked_in_at: "2026-10-29T05:00:00Z" }),
      appt({ id: "early", appointment_time: "11:00", checked_in_at: "2026-10-29T04:00:00Z" }),
      appt({ id: "pending", status: "pending" }),
      appt({ id: "seated", chair_id: "c1", checked_in_at: "a", seated_at: "2026-10-29T04:30:00Z" }),
      appt({ id: "exp2", appointment_time: "12:00" }), appt({ id: "exp1", appointment_time: "08:30" }),
    ]);
    expect(board.waiting.map((a) => a.id)).toEqual(["early", "late"]);
    expect(board.expected.map((a) => a.id)).toEqual(["exp1", "exp2"]);
    expect(board.inChair.get("c1")?.id).toBe("seated");
  });
  it("shows first name and last initial only", () => {
    expect(displayName("Master J Sai Vishnav")).toBe("Sai V.");
    expect(displayName("Mrs. Lavanya")).toBe("Lavanya");
    expect(displayName("Mr")).toBe("Patient");
  });
  it("counts whole minutes", () => {
    expect(minutesSince("2026-10-29T04:00:00Z", new Date("2026-10-29T04:25:59Z"))).toBe(25);
    expect(minutesSince(null, new Date())).toBe(0);
  });
});
