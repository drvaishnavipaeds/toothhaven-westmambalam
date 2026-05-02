import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Quote, Star, Play } from "lucide-react";

interface Testimonial {
  id: string;
  patient_name: string;
  patient_name_ta: string | null;
  category: string;
  quote: string;
  quote_ta: string | null;
  video_url: string | null;
  rating: number;
  is_featured: boolean;
}

const PortalTestimonials = () => {
  const { lang } = useLanguage();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const fetch = async () => {
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel("testimonials-portal")
      .on("postgres_changes", { event: "*", schema: "public", table: "testimonials" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  const avgRating = items.reduce((sum, t) => sum + (t.rating || 0), 0) / items.length;
  const fullStars = Math.round(avgRating);

  return (
    <section className="bg-card rounded-2xl p-5 shadow-elevated">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Quote className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{lang === "en" ? "Patient Voices" : "நோயாளி குரல்கள்"}</h3>
        </div>
        <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < fullStars ? "fill-secondary text-secondary" : "text-muted-foreground/40"}`} />
            ))}
          </div>
          <span className="text-xs font-semibold text-foreground">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">
            ({items.length} {lang === "en" ? "reviews" : "மதிப்புரைகள்"})
          </span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2 snap-x snap-mandatory">
        {items.map(t => (
          <div key={t.id} className="snap-start shrink-0 w-72 bg-background rounded-xl border border-border p-4 flex flex-col">
            {t.video_url && (
              <button onClick={() => setActiveVideo(t.video_url!)} className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 group bg-muted">
                <video src={t.video_url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </button>
            )}
            <Quote className="w-6 h-6 text-primary/30 mb-2" />
            <p className="text-sm text-foreground/80 leading-relaxed flex-1 italic">
              "{lang === "en" ? t.quote : (t.quote_ta || t.quote)}"
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <p className="text-sm font-semibold text-foreground">
                {lang === "en" ? t.patient_name : (t.patient_name_ta || t.patient_name)}
              </p>
              <div className="flex">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-secondary text-secondary" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
          <video src={activeVideo} controls autoPlay className="max-w-2xl w-full rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
};

export default PortalTestimonials;
