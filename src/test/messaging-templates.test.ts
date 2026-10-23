import { describe, expect, it } from "vitest";
import { mayEditTemplate, sameTemplateVariables, validateTemplate } from "../../supabase/functions/_shared/template-validation";
const valid = { name: "th_followup", language: "en", category: "UTILITY", body: "Hello {{1}}, your dental follow-up appointment is scheduled for {{2}}. Please contact Tooth Haven if you need assistance.", examples: ["Raman", "23 October"] };
describe("Messaging template safety", () => {
  it("allows English and Tamil templates with complete sample values", () => {
    expect(validateTemplate(valid)).toBeNull();
    expect(validateTemplate({ ...valid, language: "ta" })).toBeNull();
  });
  it("rejects missing samples", () => { expect(validateTemplate({ ...valid, examples: ["Raman"] })).toMatch(/sample/); });
  it("requires consecutive positional variables", () => { expect(validateTemplate({ ...valid, body: "Hello {{2}}" })).toMatch(/consecutive/); });
  it("prevents edits changing workflow parameter contracts", () => {
    expect(sameTemplateVariables("Hello {{1}}, date {{2}}", "Date {{2}}, hello {{1}}" )).toBe(true);
    expect(sameTemplateVariables("Hello {{1}}, date {{2}}", "Hello {{1}}" )).toBe(false);
  });
  it("keeps authentication and pending templates read-only", () => {
    expect(mayEditTemplate({ category: "AUTHENTICATION", status: "APPROVED", components: [{ type: "BODY", text: "Code {{1}}" }] })).toBe(false);
    expect(mayEditTemplate({ category: "UTILITY", status: "PENDING", components: [{ type: "BODY", text: "Hello" }] })).toBe(false);
    expect(mayEditTemplate({ category: "UTILITY", status: "APPROVED", components: [{ type: "BODY", text: "Hello" }] })).toBe(true);
  });
});