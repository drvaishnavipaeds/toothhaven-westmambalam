import { describe, expect, it } from "vitest";
import { issuePortalSession, verifyPortalSession } from "../../supabase/functions/_shared/portal-session";

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
});