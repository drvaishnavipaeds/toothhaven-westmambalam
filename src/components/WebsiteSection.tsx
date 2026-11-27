import { useLanguage } from "@/contexts/LanguageContext";
import WebsiteMedia from "@/components/WebsiteMedia";
import type { WebsiteSection as WebsiteSectionData } from "@/lib/website-content";

const WebsiteSection = ({ section, index }: { section: WebsiteSectionData; index: number }) => {
  const { lang } = useLanguage();
  const title = lang === "ta" && section.title_ta ? section.title_ta : section.title_en;
  const body = lang === "ta" && section.body_ta ? section.body_ta : section.body_en;

  return (
    <section id={section.section_key} className={`py-20 ${index % 2 ? "bg-background" : "bg-muted"}`}>
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{title}</h2>
          {body && <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{body}</p>}
        </div>
        {section.image_url && (
          <img src={section.image_url} alt={title} loading="lazy" className="mx-auto mb-8 max-h-[32rem] w-full max-w-5xl rounded-2xl object-cover shadow-elevated" />
        )}
        {section.video_url && (
          <div className="mx-auto mb-8 max-w-4xl">
            <WebsiteMedia id={section.id} url={section.video_url} titleEn={section.title_en} titleTa={section.title_ta} lang={lang} />
          </div>
        )}
        {section.items.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item, itemIndex) => {
              const name = lang === "ta" && item.name_ta ? item.name_ta : item.name_en;
              const role = lang === "ta" && item.role_ta ? item.role_ta : item.role_en;
              const description = lang === "ta" && item.description_ta ? item.description_ta : item.description_en;
              return (
                <article key={`${item.name_en}-${itemIndex}`} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                  {item.image_url && <img src={item.image_url} alt={name} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-foreground">{name}</h3>
                    {role && <p className="mt-1 text-sm font-medium text-primary">{role}</p>}
                    {description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default WebsiteSection;
