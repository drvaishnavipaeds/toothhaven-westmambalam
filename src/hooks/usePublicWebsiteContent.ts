import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { services as fallbackServices, type ServiceInfo } from "@/data/services";
import {
  defaultHomepage,
  normalizeSectionOrder,
  serviceFromRow,
  type HomepageContent,
  type WebsitePage,
  type WebsiteSection,
  type WebsiteService,
} from "@/lib/website-content";

export interface PublicWebsiteContent {
  services: WebsiteService[];
  homepage: HomepageContent;
  sections: WebsiteSection[];
  pages: WebsitePage[];
}

const fallbackService = (service: ServiceInfo, index: number): WebsiteService => ({
  ...service,
  id: `fallback-${service.slug}`,
  imageUrl: null,
  priceLabelEn: null,
  priceLabelTa: null,
  sortOrder: (index + 1) * 10,
  isPublished: true,
});

const fallbackContent: PublicWebsiteContent = {
  services: fallbackServices.map(fallbackService),
  homepage: defaultHomepage,
  sections: [],
  pages: [],
};

const table = (name: "website_services" | "website_homepage" | "website_sections" | "website_pages") => (supabase.from as any)(name);

const fetchPublicWebsite = async (): Promise<PublicWebsiteContent> => {
  const [serviceResult, homepageResult, sectionResult, pageResult] = await Promise.all([
    table("website_services").select("*").eq("is_published", true).order("sort_order").order("slug"),
    table("website_homepage").select("*").eq("id", "main").maybeSingle(),
    table("website_sections").select("*").eq("is_published", true).order("sort_order").order("section_key"),
    table("website_pages").select("*").eq("is_published", true).order("sort_order").order("slug"),
  ]);
  const error = serviceResult.error || homepageResult.error || sectionResult.error || pageResult.error;
  if (error) throw error;

  const sections = (sectionResult.data || []) as WebsiteSection[];
  const homepageRow = homepageResult.data;
  const homepage: HomepageContent = homepageRow ? {
    ...defaultHomepage,
    ...homepageRow,
    section_order: normalizeSectionOrder(homepageRow.section_order, sections.map((section) => section.section_key)),
    hidden_sections: Array.isArray(homepageRow.hidden_sections) ? homepageRow.hidden_sections : [],
  } : {
    ...defaultHomepage,
    section_order: normalizeSectionOrder(defaultHomepage.section_order, sections.map((section) => section.section_key)),
  };

  return {
    services: (serviceResult.data || []).map(serviceFromRow),
    homepage,
    sections,
    pages: (pageResult.data || []) as WebsitePage[],
  };
};

export const usePublicWebsiteContent = () => useQuery({
  queryKey: ["public-website-content"],
  queryFn: fetchPublicWebsite,
  placeholderData: fallbackContent,
  staleTime: 30_000,
  retry: 1,
});
