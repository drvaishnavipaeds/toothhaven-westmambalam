import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCatalogueMedicine } from "@/lib/medicine-catalog";
import { MedicineSelect, type MedicineCatalogOption } from "./ClinicalSelectors";

export function PrescriptionMedicineSelect({ catalog, value, onValueChange, onAdded }: {
  catalog: MedicineCatalogOption[];
  value: string;
  onValueChange: (name: string, item?: MedicineCatalogOption) => void;
  onAdded: (item: MedicineCatalogOption) => void;
}) {
  const [other, setOther] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const item = await addCatalogueMedicine(name);
      onAdded(item);
      onValueChange(item.name, item);
      setOther(false);
      setName("");
      toast.success("Medicine saved to catalogue");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save medicine to catalogue");
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-w-0 space-y-2">
    <MedicineSelect catalog={catalog} value={value} onValueChange={(next, item) => { setOther(false); onValueChange(next, item); }} onOther={() => { setOther(true); setName(""); }} />
    {other && <div className="space-y-2">
      <Input aria-label="New medicine name" placeholder="New medicine name" value={name} disabled={saving} onChange={(event) => setName(event.target.value)} />
      <Button type="button" size="sm" variant="outline" disabled={saving || !name.trim()} onClick={add} className="w-full">
        <Plus className="mr-1 h-4 w-4" />{saving ? "Saving…" : "Add to catalogue"}
      </Button>
    </div>}
  </div>;
}