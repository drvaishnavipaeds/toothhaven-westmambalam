import { useLanguage } from "@/contexts/LanguageContext";
import { Smile, Scan, ShieldCheck, Sparkles, Baby, Wrench, Crown, Scissors, HeartPulse, Zap } from "lucide-react";

const services = [
  { icon: Smile, en: "General Dentistry", ta: "பொது பல் மருத்துவம்", descEn: "Comprehensive check-ups, fillings, and preventive care", descTa: "முழுமையான பரிசோதனை, அடைப்பு மற்றும் தடுப்பு சிகிச்சை" },
  { icon: Crown, en: "Crowns & Bridges", ta: "கிரீடங்கள் & பாலங்கள்", descEn: "Custom-made restorations for damaged teeth", descTa: "சேதமடைந்த பற்களுக்கான தனிப்பயன் மறுசீரமைப்பு" },
  { icon: Scan, en: "CBCT Imaging", ta: "CBCT படமெடுப்பு", descEn: "3D cone beam computed tomography for precise diagnosis", descTa: "துல்லியமான நோயறிதலுக்கான 3D CBCT படமெடுப்பு" },
  { icon: Sparkles, en: "Cosmetic Dentistry", ta: "அழகு பல் மருத்துவம்", descEn: "Teeth whitening, veneers, and smile makeovers", descTa: "பற்கள் வெண்மையாக்கல், வினீர்கள் மற்றும் புன்னகை மாற்றம்" },
  { icon: ShieldCheck, en: "Dental Implants", ta: "பல் பொருத்துதல்", descEn: "Permanent tooth replacement with titanium implants", descTa: "டைட்டானியம் இம்ப்ளான்ட்களுடன் நிரந்தர பல் மாற்றம்" },
  { icon: Scissors, en: "Oral Surgery", ta: "வாய் அறுவை சிகிச்சை", descEn: "Wisdom tooth extraction and surgical procedures", descTa: "ஞான பல் அகற்றல் மற்றும் அறுவை சிகிச்சைகள்" },
  { icon: Baby, en: "Pediatric Dentistry", ta: "குழந்தை பல் மருத்துவம்", descEn: "Gentle dental care for children of all ages", descTa: "அனைத்து வயது குழந்தைகளுக்கும் மென்மையான பல் சிகிச்சை" },
  { icon: Wrench, en: "Orthodontics", ta: "பல் சீரமைப்பு", descEn: "Braces, aligners, and teeth straightening solutions", descTa: "பிரேஸ்கள், அலைனர்கள் மற்றும் பல் நேராக்குதல்" },
  { icon: HeartPulse, en: "Root Canal Treatment", ta: "வேர் கால்வாய் சிகிச்சை", descEn: "Pain-free endodontic treatment to save teeth", descTa: "பற்களைக் காப்பாற்ற வலியில்லா சிகிச்சை" },
  { icon: Zap, en: "Digital Smile Design", ta: "டிஜிட்டல் புன்னகை வடிவமைப்பு", descEn: "Computer-aided smile planning and preview", descTa: "கணினி உதவியுடன் புன்னகை திட்டமிடல்" },
];

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
          {services.map((s, i) => (
            <div
              key={i}
              className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow group cursor-pointer border border-border hover:border-primary/30"
            >
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <s.icon className="w-6 h-6 text-accent-foreground group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{lang === "en" ? s.en : s.ta}</h3>
              <p className="text-sm text-muted-foreground">{lang === "en" ? s.descEn : s.descTa}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
