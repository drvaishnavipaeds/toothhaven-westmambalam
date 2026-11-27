import type { ServiceFaq, ServiceInfo } from "@/data/services";

export const DEFAULT_SECTION_ORDER = ["home", "services", "about", "home-visit", "testimonials", "appointment", "contact"] as const;

export interface WebsiteService extends ServiceInfo {
  id: string;
  imageUrl: string | null;
  priceLabelEn: string | null;
  priceLabelTa: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface WebsiteItem {
  name_en: string;
  name_ta: string;
  role_en: string;
  role_ta: string;
  description_en: string;
  description_ta: string;
  image_url: string;
}

export interface WebsiteSection {
  id: string;
  section_key: string;
  title_en: string;
  title_ta: string | null;
  body_en: string;
  body_ta: string | null;
  image_url: string | null;
  video_url: string | null;
  items: WebsiteItem[];
  sort_order: number;
  show_in_menu: boolean;
  is_published: boolean;
}

export interface WebsitePage {
  id: string;
  slug: string;
  title_en: string;
  title_ta: string | null;
  content_en: string;
  content_ta: string | null;
  image_url: string | null;
  video_url: string | null;
  sort_order: number;
  show_in_menu: boolean;
  is_published: boolean;
}

export interface HomepageContent {
  id: string;
  hero_title_en: string;
  hero_title_ta: string | null;
  hero_subtitle_en: string;
  hero_subtitle_ta: string | null;
  hero_image_url: string | null;
  about_title_en: string;
  about_title_ta: string | null;
  about_body_en: string;
  about_body_ta: string | null;
  about_image_url: string | null;
  section_order: string[];
  hidden_sections: string[];
}

export const defaultHomepage: HomepageContent = {
  id: "main",
  hero_title_en: "One Stop for All Dental Solutions",
  hero_title_ta: "அனைத்து பல் சிகிச்சைகளுக்கும் ஒரே இடம்",
  hero_subtitle_en: "Experience advanced dental care at West Mambalam, Chennai. Led by Dr. Karthik Srinivasan.",
  hero_subtitle_ta: "மேற்கு மாம்பலம், சென்னையில் மேம்பட்ட பல் சிகிச்சை. டாக்டர் கார்த்திக் ஸ்ரீனிவாசன் வழிநடத்துகிறார்.",
  hero_image_url: null,
  about_title_en: "Meet Dr. Karthik Srinivasan",
  about_title_ta: "டாக்டர் கார்த்திக் ஸ்ரீனிவாசனை சந்தியுங்கள்",
  about_body_en: "",
  about_body_ta: null,
  about_image_url: null,
  section_order: [...DEFAULT_SECTION_ORDER],
  hidden_sections: [],
};

const stringList = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const faqList = (value: unknown): ServiceFaq[] => Array.isArray(value)
  ? value.filter((item): item is ServiceFaq => {
      if (!item || typeof item !== "object") return false;
      const faq = item as Record<string, unknown>;
      return typeof faq.qEn === "string" && typeof faq.aEn === "string";
    }).map((faq) => ({ qEn: faq.qEn, qTa: faq.qTa || "", aEn: faq.aEn, aTa: faq.aTa || "" }))
  : [];

export const serviceFromRow = (row: Record<string, any>): WebsiteService => ({
  id: row.id,
  slug: row.slug,
  icon: row.icon || "Smile",
  en: row.name_en,
  ta: row.name_ta || row.name_en,
  descEn: row.short_description_en || "",
  descTa: row.short_description_ta || row.short_description_en || "",
  aboutEn: row.about_en || "",
  aboutTa: row.about_ta || row.about_en || "",
  highlightsEn: stringList(row.highlights_en),
  highlightsTa: stringList(row.highlights_ta),
  faqs: faqList(row.faqs),
  imageUrl: row.image_url || null,
  priceLabelEn: row.price_label_en || null,
  priceLabelTa: row.price_label_ta || null,
  sortOrder: row.sort_order ?? 100,
  isPublished: Boolean(row.is_published),
});

export const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80);

export const normalizeSectionOrder = (saved: unknown, customKeys: string[] = []): string[] => {
  const allowed = new Set([...DEFAULT_SECTION_ORDER, ...customKeys]);
  const ordered = stringList(saved).filter((key) => allowed.has(key));
  const unique = [...new Set(ordered)];
  DEFAULT_SECTION_ORDER.forEach((key) => { if (!unique.includes(key)) unique.push(key); });
  const missingCustom = customKeys.filter((key) => !unique.includes(key));
  if (missingCustom.length) {
    const aboutIndex = unique.indexOf("about");
    unique.splice(aboutIndex >= 0 ? aboutIndex + 1 : unique.length, 0, ...missingCustom);
  }
  return unique;
};

export const emptyWebsiteItem = (): WebsiteItem => ({
  name_en: "", name_ta: "", role_en: "", role_ta: "", description_en: "", description_ta: "", image_url: "",
});

export const cleanWebsiteItems = (items: WebsiteItem[]) => items
  .map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.trim()])) as unknown as WebsiteItem)
  .filter((item) => item.name_en || item.description_en || item.image_url);

export const isValidHttpsUrl = (value: string) => {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};
