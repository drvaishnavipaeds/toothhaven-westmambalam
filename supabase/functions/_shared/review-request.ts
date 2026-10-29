// Pure helpers for the post-visit Google review request (kept Deno-free for tests).
const HOUR = 3600000;
export const REVIEW_TEMPLATE = "th_google_review_v1";
export const REVIEW_DELAY_MS = 2 * HOUR;
/** The message says "today", so a request that could not go out within a day is dropped. */
export const REVIEW_MAX_LATE_MS = 24 * HOUR;
/** One request per phone in this window, so family members visiting together get one message. */
export const REVIEW_PHONE_COOLDOWN_MS = 90 * 24 * HOUR;

export const REVIEW_TEMPLATE_BODY = "Hello {{1}}, thank you for visiting Dr. Karthik at Tooth Haven today! If you had a pleasant experience, please take 15 seconds to share a quick Google review: {{2}} Thank you for trusting us with your smile.";

const TITLES = new Set(["master", "mr", "mrs", "ms", "miss", "dr", "baby", "kum", "selvi", "thiru", "tmt", "smt", "sri", "shri", "mx"]);

/** "Master J Sai Vishnav" → "Sai", "Mrs. Lavanya" → "Lavanya". */
export function patientFirstName(fullName: string | null | undefined): string {
  const words = String(fullName ?? "").split(/[\s.]+/).filter(Boolean);
  const name = words.find((w) => !TITLES.has(w.toLowerCase()) && w.replace(/[^a-z]/gi, "").length > 1);
  return name ?? "there";
}

export function reviewDueAt(completedAt: string): Date {
  return new Date(new Date(completedAt).getTime() + REVIEW_DELAY_MS);
}

export function validReviewUrl(url: string | null | undefined): string | null {
  try {
    const parsed = new URL(String(url ?? "").trim());
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch { return null; }
}

export function reviewMessage(firstName: string, url: string): string {
  return REVIEW_TEMPLATE_BODY.replace("{{1}}", firstName).replace("{{2}}", url);
}
