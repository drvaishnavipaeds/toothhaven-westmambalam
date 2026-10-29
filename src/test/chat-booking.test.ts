import { describe, expect, it, vi } from "vitest";
import { advanceBooking, type BookingState } from "../../supabase/functions/_shared/chat-booking-flow";
import { appointmentReviewUrl, DOCTOR_PHONE } from "../../supabase/functions/_shared/doctor-alert-config";
import { validMetaSignature } from "../../supabase/functions/_shared/webhook-signature";

const verified: BookingState = { step: "date", token: "verified-session", expiresAt: Date.now() + 1800000, service: "General Dentistry" };
describe("verified chat booking", () => {
  it("requires OTP verification before showing services", async () => {
    const otp = vi.fn().mockResolvedValue({});
    const workflow = vi.fn();
    const result = await advanceBooking({ step: "otp" }, "123456", "9585996484", { otp, workflow });
    expect(result.state?.step).toBe("otp");
    expect(workflow).not.toHaveBeenCalled();
  });
  it("asks which family member is visiting when a verified number has several patients", async () => {
    const otp = vi.fn().mockResolvedValue({ token: "phone-session", expiresAt: Date.now() + 1800000 });
    const profiles = [{ id: "6a1a2fb7-7228-47e8-89cb-d27741ccfc41", name: "Mrs. Lavanya" }, { id: "eb30c71b-305d-4fc9-b8aa-c3c42f5331fb", name: "Master J Sai Vishnav" }];
    const workflow = vi.fn().mockResolvedValue({ profiles });
    const asked = await advanceBooking({ step: "otp" }, "123456", "9585996484", { otp, workflow });
    expect(workflow).toHaveBeenCalledWith({ action: "portal_profiles", portalToken: "phone-session" });
    expect(asked.state?.step).toBe("profile");
    expect(asked.reply).toContain("Who is visiting today?\n1. Mrs. Lavanya\n2. Master J Sai Vishnav");
    const invalid = await advanceBooking(asked.state, "3", "9585996484", { otp, workflow });
    expect(invalid.state?.step).toBe("profile");
    workflow.mockResolvedValueOnce({ token: "child-session", expiresAt: Date.now() + 1700000 });
    const chosen = await advanceBooking(asked.state, "2", "9585996484", { otp, workflow });
    expect(workflow).toHaveBeenLastCalledWith({ action: "portal_select", portalToken: "phone-session", patientId: profiles[1].id });
    expect(chosen.state).toMatchObject({ step: "service", token: "child-session" });
    expect(chosen.reply).toContain("Booking for Master J Sai Vishnav");
  });
  it("skips the family question when only one patient uses the number", async () => {
    const otp = vi.fn().mockResolvedValue({ token: "phone-session", expiresAt: Date.now() + 1800000 });
    const result = await advanceBooking({ step: "otp" }, "123456", "9585996484", { otp, workflow: vi.fn().mockResolvedValue({ profiles: [{ id: "x", name: "Only" }] }) });
    expect(result.state).toMatchObject({ step: "service", token: "phone-session" });
  });
  it("fails closed when calendar slots are missing", async () => {
    const result = await advanceBooking(verified, "2026-10-12", "9585996484", { otp: vi.fn(), workflow: vi.fn().mockResolvedValue({}) });
    expect(result.state?.step).toBe("date");
    expect(result.state?.slots).toBeUndefined();
  });
  it("rejects times not returned by the calendar workflow", async () => {
    const workflow = vi.fn();
    const result = await advanceBooking({ ...verified, step: "time", slots: ["19:00"] }, "19:30", "9585996484", { otp: vi.fn(), workflow });
    expect(result.state?.step).toBe("time");
    expect(workflow).not.toHaveBeenCalled();
  });
  it("rechecks selected slots through book and saves only pending requests", async () => {
    const workflow = vi.fn().mockResolvedValue({ appointment: { id: "saved-appointment", status: "pending" }, adminNotification: { ok: false } });
    const result = await advanceBooking({ ...verified, step: "confirm", date: "2026-10-12", time: "19:00" }, "REQUEST", "9585996484", { otp: vi.fn(), workflow });
    expect(workflow).toHaveBeenCalledWith({ action: "book", portalToken: "verified-session", date: "2026-10-12", time: "19:00", service: "General Dentistry", durationMinutes: 30, source: "whatsapp" });
    expect(result.state?.appointmentId).toBe("saved-appointment");
    expect(result.state?.step).toBe("done");
  });
  it("never books with an expired verified session", async () => {
    const workflow = vi.fn();
    const result = await advanceBooking({ ...verified, expiresAt: 1 }, "2026-10-12", "9585996484", { otp: vi.fn(), workflow });
    expect(result.state).toBeNull();
    expect(workflow).not.toHaveBeenCalled();
  });
  it("routes doctor 8925166149 to authenticated review, not a confirmation endpoint", () => {
    expect(DOCTOR_PHONE).toBe("8925166149");
    const id = "18580ba5-a693-449a-8fd8-9fe727063726";
    expect(appointmentReviewUrl(id)).toBe(`https://www.toothhaven.in/admin/dashboard?tab=appointments&appointment=${id}`);
    expect(() => appointmentReviewUrl("../confirm")).toThrow();
  });
  it("rejects unsigned and tampered Meta callbacks", async () => {
    const raw = '{"entry":[]}';
    const secret = "test-only-signature-secret";
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
    const signature = "sha256=" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    expect(await validMetaSignature(raw, signature, secret)).toBe(true);
    expect(await validMetaSignature(raw + " ", signature, secret)).toBe(false);
    expect(await validMetaSignature(raw, null, secret)).toBe(false);
  });
});