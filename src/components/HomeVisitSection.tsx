import { useLanguage } from "@/contexts/LanguageContext";
import { Home, CheckCircle, Phone } from "lucide-react";
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
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-6">
              <Home className="w-5 h-5" />
              <span className="font-semibold text-sm">{t("nav.homeVisit")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t("homeVisit.title")}</h2>
            <p className="text-muted-foreground mb-8">{t("homeVisit.subtitle")}</p>
            <div className="mb-8">
              <h3 className="font-semibold text-foreground mb-4">{t("homeVisit.eligible")}</h3>
              <ul className="space-y-3">
                {criteria.map((c, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground/80">{t(c.key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="#appointment"
              className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Phone className="w-5 h-5" />
              {t("homeVisit.cta")}
            </a>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-elevated">
            <img src={homeVisitImg} alt="Home Visit Dental Care" className="w-full aspect-video object-cover" loading="lazy" width={1280} height={720} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeVisitSection;
