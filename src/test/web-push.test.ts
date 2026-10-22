import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from "@/lib/web-push";
describe("web push key", () => {
  it("decodes the public key to a 65-byte uncompressed P-256 point", () => {
    const k = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(k.length).toBe(65);
    expect(k[0]).toBe(4);
  });
});
