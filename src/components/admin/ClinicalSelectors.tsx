import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TreatmentCatalogOption {
  id: string;
  name: string;
  category?: string | null;
  default_price?: number | null;
  hsn_sac?: string | null;
  gst_rate?: number | null;
}

export const ADULT_TEETH = {
  "Upper right": [18, 17, 16, 15, 14, 13, 12, 11],
  "Upper left": [21, 22, 23, 24, 25, 26, 27, 28],
  "Lower left": [31, 32, 33, 34, 35, 36, 37, 38],
  "Lower right": [48, 47, 46, 45, 44, 43, 42, 41],
};

export const PRIMARY_TEETH = {
  "Primary upper right": [55, 54, 53, 52, 51],
  "Primary upper left": [61, 62, 63, 64, 65],
  "Primary lower left": [71, 72, 73, 74, 75],
  "Primary lower right": [85, 84, 83, 82, 81],
};

const toothName = (tooth: number) => {
  const position = Number(String(tooth)[1]);
  if (position <= 2) return "Incisor";
  if (position === 3) return "Canine";
  if (position <= 5) return "Premolar";
  return "Molar";
};

export function ToothSelect({
  value,
  onValueChange,
  placeholder = "Select tooth (FDI)",
  includePrimary = true,
  className,
}: {
  value?: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includePrimary?: boolean;
  className?: string;
}) {
  return (
    <Select value={value || "all"} onValueChange={(next) => onValueChange(next === "all" ? "" : next)}>
      <SelectTrigger className={className} aria-label="Tooth number">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Whole mouth / not tooth-specific</SelectItem>
        {Object.entries(ADULT_TEETH).map(([arch, teeth]) => (
          <SelectGroup key={arch}>
            <SelectLabel>{arch}</SelectLabel>
            {teeth.map((tooth) => <SelectItem key={tooth} value={String(tooth)}>{tooth} · {toothName(tooth)}</SelectItem>)}
          </SelectGroup>
        ))}
        {includePrimary && Object.entries(PRIMARY_TEETH).map(([arch, teeth]) => (
          <SelectGroup key={arch}>
            <SelectLabel>{arch}</SelectLabel>
            {teeth.map((tooth) => <SelectItem key={tooth} value={String(tooth)}>{tooth} · {toothName(tooth)}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TreatmentSelect({
  catalog,
  value,
  onValueChange,
  placeholder = "Select treatment",
  className,
}: {
  catalog: TreatmentCatalogOption[];
  value?: string | null;
  onValueChange: (name: string, item?: TreatmentCatalogOption) => void;
  placeholder?: string;
  className?: string;
}) {
  const groups = catalog.reduce<Record<string, TreatmentCatalogOption[]>>((acc, item) => {
    const category = item.category?.trim() || "Other treatments";
    acc[category] = [...(acc[category] ?? []), item];
    return acc;
  }, {});

  return (
    <Select
      value={value || undefined}
      onValueChange={(name) => onValueChange(name, catalog.find((item) => item.name === name))}
    >
      <SelectTrigger className={className} aria-label="Treatment">
        <SelectValue placeholder={catalog.length ? placeholder : "No active treatments"} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groups).map(([category, items]) => (
          <SelectGroup key={category}>
            <SelectLabel>{category}</SelectLabel>
            {items.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}