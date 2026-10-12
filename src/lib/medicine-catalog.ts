import { supabase } from "@/integrations/supabase/client";

export async function addCatalogueMedicine(input: string) {
  const name = input.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Enter a medicine name");
  const pattern = name.replace(/[\\%_]/g, "\\$&");
  const existing = await supabase.from("medicine_catalog").select("*").ilike("name", pattern).order("created_at").limit(1);
  if (existing.error) throw existing.error;
  const found = existing.data?.[0];
  if (found) {
    if (found.is_active) return found;
    const activated = await supabase.from("medicine_catalog").update({ is_active: true }).eq("id", found.id).select("*").single();
    if (activated.error) throw activated.error;
    return activated.data;
  }
  // Empty strength/form give the existing composite unique key a concrete identity.
  // Patient-specific regimens must never become catalogue defaults.
  const inserted = await supabase.from("medicine_catalog").upsert(
    { name, strength: "", form: "", is_active: true },
    { onConflict: "name,strength,form", ignoreDuplicates: true },
  );
  if (inserted.error) throw inserted.error;
  const saved = await supabase.from("medicine_catalog").select("*").eq("name", name).eq("strength", "").eq("form", "").single();
  if (saved.error) throw saved.error;
  return saved.data;
}