import { useLanguage } from "@/contexts/LanguageContext";
import { Smile, Scan, ShieldCheck, Sparkles, Baby, Wrench, Crown, Scissors, HeartPulse, Zap, Search, CircleDot, Gem, Stethoscope, Syringe, Eye } from "lucide-react";

const services = [
  { icon: Smile, en: "General Dentistry", ta: "பொது பல் மருத்துவம்", descEn: "Check-ups, consultation, scaling and polishing", descTa: "பரிசோதனை, ஆலோசனை, ஸ்கேலிங் மற்றும் பாலிஷிங்" },
  { icon: ShieldCheck, en: "Dental Implants", ta: "பல் பொருத்துதல்", descEn: "Digital dental implantology and maxillofacial implants", descTa: "டிஜிட்டல் டென்டல் இம்ப்ளான்டாலஜி" },
  { icon: HeartPulse, en: "Root Canal", ta: "வேர் கால்வாய் சிகிச்சை", descEn: "Endodontics and conservative dentistry", descTa: "எண்டோடான்டிக்ஸ் மற்றும் கன்சர்வேடிவ் டென்டிஸ்ட்ரி" },
  { icon: Wrench, en: "Orthodontics", ta: "பல் சீரமைப்பு", descEn: "Braces, retainers, space maintainers and aligners", descTa: "பிரேஸ்கள், ரிடெய்னர்கள், அலைனர்கள்" },
  { icon: Sparkles, en: "Cosmetic Dentistry", ta: "அழகு பல் மருத்துவம்", descEn: "Teeth whitening, bleaching, veneers and smile makeovers", descTa: "பற்கள் வெண்மையாக்கல், வினீர்கள், புன்னகை மாற்றம்" },
  { icon: Crown, en: "Crowns & Bridges", ta: "கிரீடங்கள் & பாலங்கள்", descEn: "Ceramic crowns, zirconia, dental crowns and bridges", descTa: "செராமிக் கிரீடங்கள், ஜிர்கோனியா, பாலங்கள்" },
  { icon: Zap, en: "Digital Smile Design", ta: "டிஜிட்டல் புன்னகை வடிவமைப்பு", descEn: "Computer-aided smile planning and facial esthetics", descTa: "கணினி புன்னகை திட்டமிடல் மற்றும் முக அழகியல்" },
  { icon: Scan, en: "CBCT Imaging", ta: "CBCT படமெடுப்பு", descEn: "3D cone beam CT, RVG dental X-ray", descTa: "3D CBCT, RVG டென்டல் எக்ஸ்-ரே" },
  { icon: Scissors, en: "Oral Surgery", ta: "வாய் அறுவை சிகிச்சை", descEn: "Wisdom teeth extraction, minor oral surgery", descTa: "ஞான பல் அகற்றல், சிறு அறுவை சிகிச்சை" },
  { icon: Baby, en: "Pediatric Dentistry", ta: "குழந்தை பல் மருத்துவம்", descEn: "Child dentistry, anterior teeth, space maintainers", descTa: "குழந்தை பல் மருத்துவம், ஸ்பேஸ் மெயின்டெய்னர்கள்" },
  { icon: CircleDot, en: "Dentures", ta: "செயற்கை பற்கள்", descEn: "Artificial teeth, full mouth rehabilitation", descTa: "செயற்கை பற்கள், முழு வாய் மறுவாழ்வு" },
  { icon: Gem, en: "Tooth Jewellery", ta: "பல் நகை", descEn: "Cosmetic tooth jewellery and accessories", descTa: "அழகு பல் நகைகள்" },
  { icon: Search, en: "Oral Cancer Screening", ta: "வாய் புற்றுநோய் பரிசோதனை", descEn: "Oral cancer screening and surgical intervention", descTa: "வாய் புற்றுநோய் பரிசோதனை மற்றும் அறுவை சிகிச்சை" },
  { icon: Syringe, en: "Gum Surgery", ta: "ஈறு அறுவை சிகிச்சை", descEn: "Post and core, filling and restoration", descTa: "ஈறு சிகிச்சை, நிரப்புதல் மற்றும் மறுசீரமைப்பு" },
  { icon: Eye, en: "Geriatric Dentistry", ta: "முதியோர் பல் மருத்துவம்", descEn: "Specialized dental care for elderly patients", descTa: "முதியோருக்கான சிறப்பு பல் சிகிச்சை" },
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
              <h3 className="font-semibold text-foreground mb-2 text-sm">{lang === "en" ? s.en : s.ta}</h3>
              <p className="text-xs text-muted-foreground">{lang === "en" ? s.descEn : s.descTa}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
