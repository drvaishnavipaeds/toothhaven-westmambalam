import { beforeEach, describe, expect, it } from "vitest";
import { hasPin, isValidPin, MAX_PIN_ATTEMPTS, setPin, verifyPin } from "@/lib/app-lock";

describe("admin PIN re-entry", () => {
  beforeEach(() => localStorage.clear());

  it("accepts only 4-8 digit PINs", () => {
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });

  it("never stores the PIN in plain text", async () => {
    await setPin("u1", "4826");
    expect(JSON.stringify(localStorage)).not.toContain("4826");
  });

  it("unlocks with the right PIN and rejects a wrong one", async () => {
    await setPin("u1", "4826");
    expect(await verifyPin("u1", "0000")).toBe("wrong");
    expect(await verifyPin("u1", "4826")).toBe("ok");
  });

  it("wipes the PIN after 5 wrong attempts", async () => {
    await setPin("u1", "4826");
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) expect(await verifyPin("u1", "0000")).toBe("wrong");
    expect(await verifyPin("u1", "0000")).toBe("locked_out");
    expect(hasPin("u1")).toBe(false);
    expect(await verifyPin("u1", "4826")).toBe("locked_out");
  });
});
