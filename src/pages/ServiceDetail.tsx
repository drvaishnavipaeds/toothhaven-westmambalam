import { Link, useParams } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowLeft, Check, MessageCircle, Phone } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HavenAIChatbot from "@/components/HavenAIChatbot";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { services } from "@/data/services";

const askHaven = (question: string, lang: "en" | "ta") => {
  window.dispatchEvent(new CustomEvent("haven:ask", { detail: { question, lang } }));
};

const ServiceDetailContent = () => {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const service = services.find((s) => s.slug === slug);

  if (!service) {
    return (
      <div className="container mx-auto px-4 py-28 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-3">Service not found</h1>
        <Link to="/#services" className="text-primary underline">
          Back to all services
        </Link>
      </div>
    );
  }

  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[service.icon] ?? Icons.Smile;
  const name = lang === "en" ? service.en : service.ta;
  const about = lang === "en" ? service.aboutEn : service.aboutTa;
  const highlights = lang === "en" ? service.highlightsEn : service.highlightsTa;

  return (
    <>
      <section className="bg-gradient-primary text-primary-foreground pt-28 pb-14">
        <div className="container mx-auto px-4">
          <Link to="/#services" className="inline-flex items-center gap-2 text-sm opacity-90 hover:opacity-100 mb-6">
            <ArrowLeft className="w-4 h-4" />
            {lang === "en" ? "All services" : "அனைத்து சேவைகள்"}
          </Link>
          <div className="flex items-start gap-4">
            <span className="w-14 h-14 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
              <Icon className="w-7 h-7" />
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{name}</h1>
              <p className="mt-2 opacity-90 max-w-2xl">{lang === "en" ? service.descEn : service.descTa}</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              {lang === "en" ? "About this treatment" : "இந்த சிகிச்சை பற்றி"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{about}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              {lang === "en" ? "What's included" : "இதில் அடங்குபவை"}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 bg-card border border-border rounded-lg p-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{h}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              {lang === "en" ? "Frequently asked questions" : "அடிக்கடி கேட்கப்படும் கேள்விகள்"}
            </h2>
            <Accordion type="single" collapsible className="bg-card border border-border rounded-xl px-4">
              {service.faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {lang === "en" ? f.qEn : f.qTa}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <p>{lang === "en" ? f.aEn : f.aTa}</p>
                    <button
                      type="button"
                      onClick={() =>
                        askHaven(
                          lang === "en"
                            ? `About ${service.en}: ${f.qEn}`
                            : `${service.ta} பற்றி: ${f.qTa}`,
                          lang,
                        )
                      }
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {lang === "en" ? "Ask Dr. Karthik's assistant" : "உதவியாளரிடம் கேளுங்கள்"}
                    </button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5 shadow-card lg:sticky lg:top-28 space-y-3">
            <h3 className="font-bold text-foreground">
              {lang === "en" ? "Still have a question?" : "இன்னும் கேள்வி உள்ளதா?"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {lang === "en"
                ? `Ask our assistant anything about ${service.en} — it answers in English or Tamil, 24/7.`
                : `${service.ta} பற்றி எந்த கேள்வியையும் எங்கள் உதவியாளரிடம் கேளுங்கள் — 24/7 தமிழிலும் பதில்.`}
            </p>
            <Button
              className="w-full"
              onClick={() =>
                askHaven(
                  lang === "en"
                    ? `I would like to know more about ${service.en} at Tooth Haven.`
                    : `Tooth Haven-ல் ${service.ta} பற்றி மேலும் அறிய விரும்புகிறேன்.`,
                  lang,
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              {lang === "en" ? "Ask about this service" : "இந்த சேவை பற்றி கேளுங்கள்"}
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/#appointment">{lang === "en" ? "Book an appointment" : "முன்பதிவு செய்யுங்கள்"}</a>
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <a href="tel:+918925166149">
                <Phone className="w-4 h-4" />
                +91 89251 66149
              </a>
            </Button>
          </div>
        </aside>
      </main>

      <section className="border-t border-border bg-muted py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {lang === "en" ? "Other services" : "மற்ற சேவைகள்"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {services
              .filter((s) => s.slug !== service.slug)
              .map((s) => (
                <Link
                  key={s.slug}
                  to={`/services/${s.slug}`}
                  className="text-xs px-3 py-2 rounded-full bg-card border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {lang === "en" ? s.en : s.ta}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </>
  );
};

const ServiceDetail = () => (
  <LanguageProvider>
    <Navbar />
    <ServiceDetailContent />
    <Footer />
    <HavenAIChatbot />
  </LanguageProvider>
);

export default ServiceDetail;
