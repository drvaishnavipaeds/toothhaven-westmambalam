import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Clock, Mail, Phone, ExternalLink } from "lucide-react";
import logo from "@/assets/tooth-haven-logo.png";

const ContactSection = () => {
  const { t } = useLanguage();

  return (
    <section id="contact" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("contact.title")}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl p-8 shadow-card border border-border space-y-6">
            <img src={logo} alt="Tooth Haven" className="h-12 mb-2" />
            <p className="font-semibold text-foreground">Dr. Karthik Srinivasan</p>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-foreground/80">{t("contact.address")}</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground/80">{t("contact.hours")}</p>
                <p className="text-foreground/80">{t("contact.sunday")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <a href="mailto:karthiktoothhaven25@gmail.com" className="text-primary hover:underline">
                karthiktoothhaven25@gmail.com
              </a>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
            <h3 className="font-semibold text-foreground mb-6">Find Us Online</h3>
            <div className="space-y-4">
              {[
                { label: "JustDial", url: "https://www.justdial.com/Chennai/Tooth-Haven-West-Mambalam/044PXX44-XX44-180411011501-B7F3_BZDET" },
                { label: "Dentee", url: "https://www.dentee.com/dentist/chennai/dr-karthik-srinivasan/22d22000-5b46-4f59-9741-91e338ececcd" },
                { label: "Google", url: "https://share.google/kcNKBCfWKrL3iGRcN" },
                { label: "Facebook", url: "https://www.facebook.com/toothhavenindia/" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-foreground/80 group-hover:text-primary transition-colors font-medium">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
