import { useLanguage } from "@/contexts/LanguageContext";
import drKarthik from "@/assets/dr-karthik.jpg";
import { Award, GraduationCap, Users } from "lucide-react";

const AboutSection = () => {
  const { t, lang } = useLanguage();

  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-elevated">
              <img src={drKarthik} alt="Dr. Karthik Srinivasan" className="w-full aspect-[4/5] object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-dark/90 to-transparent p-6">
                <h3 className="text-xl font-bold text-primary-foreground">Dr. Karthik Srinivasan</h3>
                <p className="text-primary-foreground/80 text-sm">
                  {lang === "en" ? "BDS - Chief Dentist, West Mambalam" : "BDS - தலைமை பல் மருத்துவர், மேற்கு மாம்பலம்"}
                </p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t("about.title")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {lang === "en"
                ? "Dr. Karthik Srinivasan leads the West Mambalam branch of Tooth Haven Advanced Dental Care. A BDS graduate from Sree Balaji Dental College and Hospital, Chennai (2010), registered with Tamil Nadu Dental Council (Reg. No. 20674), he brings over 13 years of experience in advanced dental care."
                : "டாக்டர் கார்த்திக் ஸ்ரீனிவாசன் டூத் ஹேவன் மல்டிஸ்பெஷாலிட்டி டென்டல் கேரின் மேற்கு மாம்பலம் கிளையை வழிநடத்துகிறார். சென்னை ஸ்ரீ பாலாஜி டென்டல் கல்லூரியில் BDS பட்டம் பெற்ற இவர், தமிழ்நாடு டென்டல் கவுன்சிலில் பதிவு செய்யப்பட்டவர் (பதிவு எண். 20674). 13 ஆண்டுகளுக்கும் மேலான அனுபவம் கொண்டவர்."}
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
              {lang === "en"
                ? "Specializations: Oral Implantologist, Oral Rehabilitation, Orthodontist, Implantologist, Aesthetic Dentist, Pedodontist, Smile Designing, Consulting Dental Surgeon, Conservative Dentistry & Endodontics, Oral Surgeon, Cosmetic Dentist."
                : "நிபுணத்துவம்: ஓரல் இம்ப்ளான்டாலஜிஸ்ட், ஆர்த்தோடான்டிஸ்ட், அழகியல் பல் மருத்துவர், குழந்தை பல் மருத்துவர், ஸ்மைல் டிசைனிங், கன்சர்வேடிவ் டென்டிஸ்ட்ரி & எண்டோடான்டிக்ஸ், ஓரல் சர்ஜன், காஸ்மெடிக் டென்டிஸ்ட்."}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: GraduationCap, label: "BDS", sub: lang === "en" ? "Sree Balaji" : "ஸ்ரீ பாலாஜி" },
                { icon: Award, label: "13+", sub: lang === "en" ? "Years Exp." : "ஆண்டுகள்" },
                { icon: Users, label: "₹200", sub: lang === "en" ? "Consultation" : "ஆலோசனை" },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-accent border border-border">
                  <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-bold text-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
