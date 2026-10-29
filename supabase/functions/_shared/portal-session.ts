/** One patient-session format shared by WhatsApp, verified email and records. */
const SESSION_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalIdentity = { phone: string; patientId: string | null };

/** A session proves ownership of a phone; once a family member is chosen it is also bound to that patient. */
export async function issuePortalSession(phone: string, secret: string, now = Date.now(), options: { patientId?: string; expiresAt?: number } = {}) {
  if (!/^\d{10}$/.test(phone) || !secret) throw new Error("Invalid patient session");
  if (options.patientId && !UUID.test(options.patientId)) throw new Error("Invalid patient session");
  const expiresAt = Math.min(options.expiresAt ?? now + SESSION_MS, now + SESSION_MS);
  if (expiresAt <= now) throw new Error("Invalid patient session");
  const payload = options.patientId ? `${phone}.${expiresAt}.${options.patientId}` : `${phone}.${expiresAt}`;
  const signature = await digest(payload + secret);
  return { token: btoa(`${payload}.${signature}`), phone, expiresAt, patientId: options.patientId ?? null };
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPortalIdentity(token: string, secret: string, now = Date.now()): Promise<PortalIdentity & { expiresAt: number } | null> {
  try {
    if (!secret || token.length > 512) return null;
    const parts = atob(token).split(".");
    if (parts.length !== 3 && parts.length !== 4) return null;
    const [phone, expiry] = parts;
    const patientId = parts.length === 4 ? parts[2] : null;
    const signature = parts[parts.length - 1];
    const expiresAt = Number(expiry);
    if (!/^\d{10}$/.test(phone) || !/^\d+$/.test(expiry) || !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + SESSION_MS || !/^[a-f0-9]{64}$/.test(signature)) return null;
    if (patientId !== null && !UUID.test(patientId)) return null;
    const expected = await digest(parts.slice(0, -1).join(".") + secret);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return difference === 0 ? { phone, patientId, expiresAt } : null;
  } catch { return null; }
}

export async function verifyPortalSession(token: string, secret: string, now = Date.now()): Promise<string | null> {
  return (await verifyPortalIdentity(token, secret, now))?.phone ?? null;
}
