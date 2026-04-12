import { useLanguage } from "@/contexts/LanguageContext";
import drKarthik from "@/assets/dr-karthik.jpg";
import { Award, GraduationCap, Users } from "lucide-react";

const AboutSection = () => {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-elevated">
              <img src={drKarthik} alt="Dr. Karthik Srinivasan" className="w-full aspect-[4/5] object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-dark/90 to-transparent p-6">
                <h3 className="text-xl font-bold text-primary-foreground">Dr. Karthik Srinivasan</h3>
                <p className="text-primary-foreground/80 text-sm">{t("about.designation")}</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t("about.title")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">{t("about.bio")}</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: GraduationCap, label: "BDS, MDS", sub: "Qualified" },
                { icon: Award, label: "10+", sub: "Years Exp." },
                { icon: Users, label: "5000+", sub: "Patients" },
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
