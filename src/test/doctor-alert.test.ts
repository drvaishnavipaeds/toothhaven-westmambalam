import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../supabase/functions/_shared/whatsapp.ts", () => ({
  DEFAULT_LANG: "en", toE164: (phone: string) => `91${phone}`,
  isWindowOpen: vi.fn().mockResolvedValue(false),
  listApprovedTemplates: vi.fn().mockResolvedValue([{ name: "th_doctor_appointment_review_v1", language: "en" }]),
  sendTemplate: vi.fn().mockResolvedValue({ ok: true, id: "message-test" }),
  sendText: vi.fn(), logMessage: vi.fn(), createMessageTemplate: vi.fn(),
}));

import { retryFailedDoctorAlerts, sendDoctorAlert } from "../../supabase/functions/_shared/doctor-alert";
import { sendTemplate } from "../../supabase/functions/_shared/whatsapp";

const appointment = { id: "18580ba5-a693-449a-8fd8-9fe727063726", status: "pending", patient_name: "Test Patient", patient_phone: "9000000000", appointment_date: "2026-10-12", appointment_time: "19:00" };

function fakeAdmin(results: unknown[]) {
  const writes: any[] = [];
  const queries: any[] = [];
  const admin = { from: vi.fn(() => {
    const result = results.shift();
    const query: any = {};
    for (const method of ["select", "eq", "in", "lte", "order", "limit", "insert", "update"]) {
      query[method] = vi.fn((...args: unknown[]) => {
        if (method === "insert" || method === "update") writes.push(args[0]);
        return query;
      });
    }
    query.maybeSingle = vi.fn().mockResolvedValue(result);
    query.single = vi.fn().mockResolvedValue(result);
    query.then = (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve);
    queries.push(query);
    return query;
  }) };
  return { admin, writes, queries };
}

describe("doctor appointment alert reliability", () => {
  beforeEach(() => vi.clearAllMocks());
  it("immediately sends the review template to 8925166149 and tracks the attempt", async () => {
    const { admin, writes } = fakeAdmin([{ data: null }, { data: { id: "ledger" } }, { error: null }]);
    expect((await sendDoctorAlert(admin, appointment, "New appointment request — please review.")).ok).toBe(true);
    expect(sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ to: "8925166149", name: "th_doctor_appointment_review_v1" }));
    expect(writes[0].metadata.attempts).toBe(1);
    expect(writes[0].metadata.reviewUrl).toContain(`appointment=${appointment.id}`);
  });
  it.each(["sending", "sent", "delivered", "read"])("does not resend an alert already %s", async (status) => {
    const { admin } = fakeAdmin([{ data: { id: "ledger", status } }]);
    await sendDoctorAlert(admin, appointment, "New appointment request");
    expect(sendTemplate).not.toHaveBeenCalled();
  });
  it("retries failed sends after five minutes using the same atomic ledger claim", async () => {
    const row = { id: "ledger", appointment_id: appointment.id, event_key: "admin_request", metadata: { attempts: 1, message: "New appointment request" } };
    const { admin, writes, queries } = fakeAdmin([{ data: [row] }, { data: appointment }, { data: { ...row, status: "failed" } }, { data: { id: "ledger" } }, { error: null }]);
    expect(await retryFailedDoctorAlerts(admin, new Date("2026-10-11T02:00:00Z"))).toEqual({ retried: 1 });
    expect(queries[0].lte).toHaveBeenCalledWith("failed_at", "2026-10-11T01:55:00.000Z");
    expect(queries[3].eq).toHaveBeenCalledWith("status", "failed");
    expect(writes[0].metadata.attempts).toBe(2);
  });
  it("bounds failed alerts to six attempts", async () => {
    const { admin } = fakeAdmin([{ data: [{ metadata: { attempts: 6 } }] }]);
    expect(await retryFailedDoctorAlerts(admin)).toEqual({ retried: 0 });
    expect(admin.from).toHaveBeenCalledTimes(1);
    expect(sendTemplate).not.toHaveBeenCalled();
  });
  it("skips outdated request alerts once the appointment is confirmed", async () => {
    const { admin, writes } = fakeAdmin([{ data: [{ id: "ledger", appointment_id: appointment.id, event_key: "admin_request" }] }, { data: { ...appointment, status: "confirmed" } }, { error: null }]);
    await retryFailedDoctorAlerts(admin);
    expect(writes[0].status).toBe("skipped");
    expect(sendTemplate).not.toHaveBeenCalled();
  });
  it("keeps tentative and expiry alerts distinct", async () => {
    const { admin, writes } = fakeAdmin([{ data: null }, { data: { id: "ledger" } }, { error: null }]);
    await sendDoctorAlert(admin, { ...appointment, status: "expired" }, "Tentative hold expired and needs follow-up.");
    expect(writes[0].event_key).toBe("admin_alert:expired");
  });
});