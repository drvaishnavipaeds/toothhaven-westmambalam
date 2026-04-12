import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Phone } from "lucide-react";
import heroImage from "@/assets/hero-dental.jpg";

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Tooth Haven Dental Clinic" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/90 via-primary/80 to-primary/60" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <div className="inline-block px-4 py-1.5 bg-primary-foreground/10 backdrop-blur-sm rounded-full border border-primary-foreground/20 mb-6">
            <span className="text-primary-foreground text-sm font-medium">🦷 Tooth Haven Multispeciality Dental Care</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            {t("hero.tagline")}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/85 mb-8 leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#appointment"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90 transition-opacity shadow-elevated"
            >
              <Calendar className="w-5 h-5" />
              {t("hero.cta")}
            </a>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center justify-center gap-2 border-2 border-primary-foreground/40 text-primary-foreground px-6 py-3 rounded-lg text-base font-semibold hover:bg-primary-foreground/10 transition-colors"
            >
              <Phone className="w-5 h-5" />
              {t("hero.callNow")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
