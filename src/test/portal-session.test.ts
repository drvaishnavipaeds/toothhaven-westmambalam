import { describe, expect, it } from "vitest";
import { issuePortalSession, verifyPortalIdentity, verifyPortalSession } from "../../supabase/functions/_shared/portal-session";

describe("verified patient sessions", () => {
  const secret = "test-only-session-signing-secret";
  const now = 1791300000000;
  it("uses one valid session format for all portal actions", async () => {
    const session = await issuePortalSession("9000000000", secret, now);
    expect(await verifyPortalSession(session.token, secret, now)).toBe(session.phone);
    expect(session.expiresAt).toBe(now + 1800000);
  });
  it("rejects expired sessions and a different signing key", async () => {
    const session = await issuePortalSession("9000000000", secret, now);
    expect(await verifyPortalSession(session.token, secret, session.expiresAt)).toBeNull();
    expect(await verifyPortalSession(session.token, "wrong-secret", now)).toBeNull();
  });
  it("rejects tampering, malformed expiry, arbitrary JWTs and unsigned identities", async () => {
    const session = await issuePortalSession("9000000000", secret, now);
    const decoded = atob(session.token);
    expect(await verifyPortalSession(btoa(decoded.replace("9000000000", "9000000001")), secret, now)).toBeNull();
    expect(await verifyPortalSession(btoa(decoded.replace(String(session.expiresAt), "NaN")), secret, now)).toBeNull();
    expect(await verifyPortalSession("header.payload.signature", secret, now)).toBeNull();
    expect(await verifyPortalSession(btoa("9000000000.9999999999999"), secret, now)).toBeNull();
  });
  it("binds a chosen family member without extending the session or allowing a swap", async () => {
    const phoneOnly = await issuePortalSession("9000000000", secret, now);
    const child = "6a1a2fb7-7228-47e8-89cb-d27741ccfc41";
    const bound = await issuePortalSession("9000000000", secret, now + 60000, { patientId: child, expiresAt: phoneOnly.expiresAt });
    expect(bound.expiresAt).toBe(phoneOnly.expiresAt);
    expect(await verifyPortalIdentity(bound.token, secret, now)).toEqual({ phone: "9000000000", patientId: child, expiresAt: phoneOnly.expiresAt });
    expect(await verifyPortalIdentity(phoneOnly.token, secret, now)).toMatchObject({ patientId: null });
    expect(await verifyPortalSession(bound.token, secret, now)).toBe("9000000000");
    const swapped = btoa(atob(bound.token).replace(child, "eb30c71b-305d-4fc9-b8aa-c3c42f5331fb"));
    expect(await verifyPortalIdentity(swapped, secret, now)).toBeNull();
    expect(await verifyPortalIdentity(btoa(atob(bound.token).replace(child, "not-a-uuid")), secret, now)).toBeNull();
  });
});
