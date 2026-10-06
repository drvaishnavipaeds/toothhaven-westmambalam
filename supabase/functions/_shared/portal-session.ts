/** One patient-session format shared by WhatsApp, verified email and records. */
export async function issuePortalSession(phone: string, secret: string, now = Date.now()) {
  if (!/^\d{10}$/.test(phone) || !secret) throw new Error("Invalid patient session");
  const expiresAt = now + 30 * 60 * 1000;
  const payload = `${phone}.${expiresAt}`;
  const signature = await digest(payload + secret);
  return { token: btoa(`${payload}.${signature}`), phone, expiresAt };
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPortalSession(token: string, secret: string, now = Date.now()): Promise<string | null> {
  try {
    if (!secret || token.length > 512) return null;
    const parts = atob(token).split(".");
    if (parts.length !== 3) return null;
    const [phone, expiry, signature] = parts;
    const expiresAt = Number(expiry);
    if (!/^\d{10}$/.test(phone) || !/^\d+$/.test(expiry) || !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + 30 * 60 * 1000 || !/^[a-f0-9]{64}$/.test(signature)) return null;
    const expected = await digest(`${phone}.${expiry}` + secret);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return difference === 0 ? phone : null;
  } catch { return null; }
}