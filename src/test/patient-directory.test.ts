import { describe, expect, it } from "vitest";
import { samePatient, patientAge, patientRegistrationDate } from "@/lib/patient-directory";

describe("Patient identity and baseline details", () => {
  it("allows separate family members to share one phone", () => {
    expect(samePatient({ name: "Anitha", phone: "+919876543210" }, { name: "Arjun", phone: "9876543210" })).toBe(false);
  });
  it("matches the same name and phone despite formatting", () => {
    expect(samePatient({ name: " Anitha  R ", phone: "+919876543210" }, { name: "anitha r", phone: "98765 43210" })).toBe(true);
  });
  it("calculates age with birthday boundaries", () => {
    expect(patientAge("2000-10-24", new Date(2026, 9, 23))).toBe(25);
    expect(patientAge("2000-10-23", new Date(2026, 9, 23))).toBe(26);
  });
  it("does not invent an age for the uploaded records without birth dates", () => {
    expect(patientAge(null)).toBe(null);
  });
  it("preserves original registration date independently of import time", () => {
    expect(patientRegistrationDate({ registered_on: "2026-10-01", created_at: "2026-10-23T05:57:00Z" })).toBe("2026-10-01");
  });
});