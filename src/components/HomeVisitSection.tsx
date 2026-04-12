import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle, Phone } from "lucide-react";
import homeVisitImg from "@/assets/home-visit.jpg";

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
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-elevated border border-border overflow-hidden">
            <div className="relative">
              <img
                src={homeVisitImg}
                alt="Smile on the Go - Geriatric doorstep dental care by Tooth Haven"
                className="w-full h-64 md:h-80 object-cover"
              />
            </div>
            <div className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t("homeVisit.title")}</h2>
              <p className="text-muted-foreground mb-6">{t("homeVisit.subtitle")}</p>
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
