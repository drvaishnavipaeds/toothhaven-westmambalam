// Device-local re-entry for an already signed-in admin session. The PIN never leaves the device;
// only a salted PBKDF2 hash is stored. Too many wrong PINs wipe it and force password unlock.
const KEY = "th_admin_lock:";
export const MAX_PIN_ATTEMPTS = 5;

type Stored = { salt: string; hash: string; attempts: number; passkeyId?: string };

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256));
}

const read = (userId: string): Stored | null => {
  try { return JSON.parse(localStorage.getItem(KEY + userId) || "null"); } catch { return null; }
};
const write = (userId: string, s: Stored | null) => s ? localStorage.setItem(KEY + userId, JSON.stringify(s)) : localStorage.removeItem(KEY + userId);

export const hasPin = (userId: string) => !!read(userId)?.hash;
export const passkeyId = (userId: string) => read(userId)?.passkeyId;
export const clearPin = (userId: string) => write(userId, null);

export async function setPin(userId: string, pin: string) {
  if (!isValidPin(pin)) throw new Error("PIN must be 4–8 digits");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  write(userId, { salt: b64(salt), hash: await derive(pin, salt), attempts: 0, passkeyId: read(userId)?.passkeyId });
}

export async function verifyPin(userId: string, pin: string): Promise<"ok" | "wrong" | "locked_out"> {
  const s = read(userId);
  if (!s?.hash) return "locked_out";
  if ((await derive(pin, unb64(s.salt))) === s.hash) { write(userId, { ...s, attempts: 0 }); return "ok"; }
  const attempts = s.attempts + 1;
  if (attempts >= MAX_PIN_ATTEMPTS) { write(userId, s.passkeyId ? { salt: "", hash: "", attempts: 0, passkeyId: s.passkeyId } : null); return "locked_out"; }
  write(userId, { ...s, attempts });
  return "wrong";
}

export const passkeySupported = () => typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;

export async function registerPasskey(userId: string, label: string) {
  const cred = (await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: "Tooth Haven Admin" },
    user: { id: new TextEncoder().encode(userId), name: label, displayName: label },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
    timeout: 60000,
  } })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey was not created");
  const s = read(userId) ?? { salt: "", hash: "", attempts: 0 };
  write(userId, { ...s, passkeyId: b64(cred.rawId) });
}

export async function unlockWithPasskey(userId: string) {
  const id = passkeyId(userId);
  if (!id) return false;
  const res = await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ type: "public-key", id: unb64(id) }],
    userVerification: "required", timeout: 60000,
  } });
  return !!res;
}
