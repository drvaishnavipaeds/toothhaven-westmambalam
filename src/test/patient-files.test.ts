import { describe, expect, it } from "vitest";
import { parsePatientCsv, reviewPatientRows, safeSpreadsheetText } from "@/lib/patient-files";

describe("Bulk patient import rules", () => {
  it("imports CSV contacts without losing leading zeroes", () => {
    const rows = parsePatientCsv('Name,Phone\n"Raman, V",0987654321');
    expect(reviewPatientRows(rows, [])[0].patient.phone).toBe("0987654321");
  });
  it("permits family members sharing a phone and skips name plus normalized phone duplicates", () => {
    const result = reviewPatientRows([{ Name: "Vaishnavi Raman", Phone: "9876543210" }, { Name: "Raman", Phone: "9876543210" }], [{ name: " vaishnavi  raman ", phone: "+919876543210" }]);
    expect(result.map(r => r.duplicate)).toEqual([true, false]);
  });
  it("preserves registration dates without inventing birth dates from age", () => {
    const row = reviewPatientRows([{ "First Name": "Vaishnavi", "Last Name": "Raman", Phone: "9876543210", Age: "30", "Registration Date": "23/10/2020" }], [])[0];
    expect(row.patient.registered_on).toBe("2020-10-23");
    expect(row.patient.date_of_birth).toBeNull();
  });
  it("rejects invalid dates instead of silently replacing them", () => {
    expect(reviewPatientRows([{ Name: "Raman", Phone: "9876543210", DOB: "2020-02-31" }], [])[0].issue).toMatch(/Invalid date/);
  });
  it("skips duplicate rows within one file", () => {
    expect(reviewPatientRows([{ Name: "Raman", Phone: "9876543210" }, { Name: "Raman", Phone: "9876543210" }], []).map(r => r.duplicate)).toEqual([false, true]);
  });
  it("neutralizes spreadsheet formulas when exporting CSV", () => {
    expect(safeSpreadsheetText("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeSpreadsheetText("Raman")).toBe("Raman");
  });
  it("round-trips escaped international phone numbers", () => {
    const result = reviewPatientRows([{ Name: "Raman", Phone: safeSpreadsheetText("+919876543210") }], []);
    expect(result[0].issue).toBeNull();
    expect(result[0].patient.phone).toBe("+919876543210");
  });
});