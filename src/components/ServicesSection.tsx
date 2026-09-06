import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { services } from "@/data/services";

const ServicesSection = () => {
  const { lang, t } = useLanguage();

  return (
    <section id="services" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("services.title")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("services.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {services.map((s) => {
            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[s.icon] ?? Icons.Smile;
            return (
              <Link
                key={s.slug}
                to={`/services/${s.slug}`}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow group border border-border hover:border-primary/30 flex flex-col"
              >
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                  <Icon className="w-6 h-6 text-accent-foreground group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{lang === "en" ? s.en : s.ta}</h3>
                <p className="text-xs text-muted-foreground">{lang === "en" ? s.descEn : s.descTa}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {lang === "en" ? "Learn more" : "மேலும் அறிய"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
