import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Phone, MapPin, Clock } from "lucide-react";
import logoAsset from "@/assets/tooth-haven-logo.png.asset.json";
const logo = logoAsset.url;

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 bg-gradient-hero overflow-hidden">
      {/* Decorative tooth shapes */}
      <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary-foreground/5 blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <img src={logo} alt="Tooth Haven Advanced Dental Care" className="h-20 md:h-28 mx-auto mb-8" />
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            {t("hero.tagline")}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/85 mb-4 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex items-center justify-center gap-6 text-primary-foreground/70 text-sm mb-8">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> West Mambalam, Chennai</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Mon-Sat 11AM-2PM, 6-9PM</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#appointment"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-lg text-base font-semibold hover:opacity-90 transition-opacity shadow-elevated"
            >
              <Calendar className="w-5 h-5" />
              {t("hero.cta")}
            </a>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center justify-center gap-2 border-2 border-primary-foreground/40 text-primary-foreground px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-primary-foreground/10 transition-colors"
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
