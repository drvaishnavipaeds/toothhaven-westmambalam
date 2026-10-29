import { describe, expect, it } from "vitest";
import { patientFirstName, reviewDueAt, reviewMessage, validReviewUrl } from "../../supabase/functions/_shared/review-request";

describe("Google review request", () => {
  it("greets patients by first name without titles or initials", () => {
    expect(patientFirstName("Master J Sai Vishnav")).toBe("Sai");
    expect(patientFirstName("Mrs. Lavanya")).toBe("Lavanya");
    expect(patientFirstName("K. Priya")).toBe("Priya");
    expect(patientFirstName("")).toBe("there");
  });
  it("is due two hours after the appointment is marked completed", () => {
    expect(reviewDueAt("2026-10-29T10:15:00.000Z").toISOString()).toBe("2026-10-29T12:15:00.000Z");
  });
  it("only accepts https review links", () => {
    expect(validReviewUrl(" https://g.page/r/abc/review ")).toBe("https://g.page/r/abc/review");
    expect(validReviewUrl("http://g.page/r/abc/review")).toBeNull();
    expect(validReviewUrl("not a link")).toBeNull();
    expect(validReviewUrl(null)).toBeNull();
  });
  it("uses the clinic's thank-you wording", () => {
    expect(reviewMessage("Sai", "https://g.page/r/abc/review")).toBe("Hello Sai, thank you for visiting Dr. Karthik at Tooth Haven today! If you had a pleasant experience, please take 15 seconds to share a quick Google review: https://g.page/r/abc/review Thank you for trusting us with your smile.");
  });
});
