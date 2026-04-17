import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Award } from "lucide-react";

interface Achievement {
  id: string;
  badge_type: string;
  title: string;
  title_ta: string | null;
  description: string | null;
  description_ta: string | null;
  achieved_on: string | null;
  image_url: string | null;
}

const AchievementsWall = () => {
  const { lang } = useLanguage();
  const [items, setItems] = useState<Achievement[]>([]);

  const fetch = async () => {
    const { data } = await supabase
      .from("achievements")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("achieved_on", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel("achievements-portal")
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="bg-card rounded-2xl p-5 shadow-elevated">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">{lang === "en" ? "Our Achievements" : "எங்கள் சாதனைகள்"}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(a => (
          <div key={a.id} className="bg-background rounded-xl border border-border p-3">
            {a.image_url ? (
              <img src={a.image_url} alt={a.title} loading="lazy" className="w-12 h-12 object-cover rounded-lg mb-2" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Award className="w-6 h-6 text-primary" />
              </div>
            )}
            <p className="text-xs font-semibold text-foreground line-clamp-2">
              {lang === "en" ? a.title : (a.title_ta || a.title)}
            </p>
            {a.achieved_on && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(a.achieved_on).getFullYear()}
              </p>
            )}
            {a.description && (
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                {lang === "en" ? a.description : (a.description_ta || a.description)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default AchievementsWall;
