import { useLanguage } from "@/contexts/LanguageContext";
import { Home, CheckCircle, Phone } from "lucide-react";

const HomeVisitSection = () => {
  const { t } = useLanguage();

  const criteria = [
    { key: "homeVisit.elderly" },
    { key: "homeVisit.bedbound" },
    { key: "homeVisit.disabled" },
  ];

  return (
    <section id="home-visit" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-2xl shadow-elevated border border-border overflow-hidden">
            <div className="bg-gradient-primary p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">{t("homeVisit.title")}</h2>
              <p className="text-primary-foreground/80">{t("homeVisit.subtitle")}</p>
            </div>
            <div className="p-8">
              <h3 className="font-semibold text-foreground mb-5">{t("homeVisit.eligible")}</h3>
              <ul className="space-y-4 mb-8">
                {criteria.map((c, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground/80">{t(c.key)}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#appointment"
                className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                <Phone className="w-5 h-5" />
                {t("homeVisit.cta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeVisitSection;
