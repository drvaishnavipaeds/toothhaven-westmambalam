import { useLanguage } from "@/contexts/LanguageContext";
import { Star, Quote } from "lucide-react";

const testimonials = [
  { name: "Priya R.", nameT: "பிரியா ர.", en: "Dr. Karthik is extremely gentle and professional. The entire team at Tooth Haven made my root canal treatment absolutely painless. Highly recommended!", ta: "டாக்டர் கார்த்திக் மிகவும் மென்மையாகவும் தொழில்முறையாகவும் இருக்கிறார். டூத் ஹேவன் குழு என் வேர் கால்வாய் சிகிச்சையை வலியின்றி செய்தது. மிகவும் பரிந்துரைக்கிறேன்!", rating: 5 },
  { name: "Suresh K.", nameT: "சுரேஷ் க.", en: "Got my dental implants done here. World-class facility with the latest technology. The CBCT scan helped them plan everything perfectly.", ta: "என் பல் பொருத்துதலை இங்கே செய்தேன். நவீன தொழில்நுட்பத்துடன் உலகத்தரம் வாய்ந்த வசதி. CBCT ஸ்கேன் எல்லாவற்றையும் சரியாகத் திட்டமிட உதவியது.", rating: 5 },
  { name: "Lakshmi M.", nameT: "லக்ஷ்மி ம.", en: "The home visit service was a blessing for my elderly mother. The doctor came home and treated her with so much care and patience. Thank you Tooth Haven!", ta: "வீட்டு சேவை என் வயதான அம்மாவுக்கு ஒரு வரப்பிரசாதம். மருத்துவர் வீட்டிற்கே வந்து அவரை மிகவும் அக்கறையுடன் சிகிச்சை செய்தார். நன்றி டூத் ஹேவன்!", rating: 5 },
];

const TestimonialsSection = () => {
  const { lang, t } = useLanguage();

  return (
    <section id="testimonials" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("testimonials.title")}</h2>
          <p className="text-muted-foreground text-lg">{t("testimonials.subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow">
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="text-foreground/80 mb-6 leading-relaxed">{lang === "en" ? item.en : item.ta}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {item.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{lang === "en" ? item.name : item.nameT}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: item.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-secondary text-secondary" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
