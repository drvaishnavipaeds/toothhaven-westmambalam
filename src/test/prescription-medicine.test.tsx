import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrescriptionMedicineSelect } from "@/components/admin/PrescriptionMedicineSelect";
import type { MedicineCatalogOption } from "@/components/admin/ClinicalSelectors";

const { addMedicine } = vi.hoisted(() => ({ addMedicine: vi.fn() }));
vi.mock("@/lib/medicine-catalog", () => ({ addCatalogueMedicine: addMedicine }));
vi.mock("@/components/admin/ClinicalSelectors", () => ({
  MedicineSelect: ({ catalog, value, onValueChange, onOther }: { catalog: MedicineCatalogOption[]; value: string; onValueChange: (name: string) => void; onOther: () => void }) => <select aria-label="Medicine" value={value} onChange={(event) => event.target.value === "other" ? onOther() : onValueChange(event.target.value)}><option value="">Select</option>{catalog.map(item => <option key={item.id}>{item.name}</option>)}<option value="other">Other</option></select>,
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function Workspace() {
  const [catalog, setCatalog] = useState<MedicineCatalogOption[]>([]);
  const [value, setValue] = useState("");
  return <PrescriptionMedicineSelect catalog={catalog} value={value} onAdded={(item) => setCatalog([item])} onValueChange={setValue} />;
}

describe("medicine addition", () => {
  it("selects the persisted new medicine and makes it reusable in the dropdown", async () => {
    addMedicine.mockResolvedValue({ id: "new", name: "New medicine" });
    render(<Workspace />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "other" } });
    fireEvent.change(screen.getByRole("textbox", { name: "New medicine name" }), { target: { value: "New medicine" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to catalogue" }));
    await screen.findByRole("option", { name: "New medicine" });
    expect(screen.getByRole("combobox")).toHaveValue("New medicine");
    expect(addMedicine).toHaveBeenCalledWith("New medicine");
  });
  it("retains the entry for retry if catalogue saving fails", async () => {
    addMedicine.mockRejectedValue(new Error("Permission denied"));
    render(<Workspace />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "other" } });
    fireEvent.change(screen.getByRole("textbox", { name: "New medicine name" }), { target: { value: "Unsaved medicine" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to catalogue" }));
    await screen.findByRole("button", { name: "Add to catalogue" });
    expect(screen.getByRole("textbox")).toHaveValue("Unsaved medicine");
    expect(screen.queryByRole("option", { name: "Unsaved medicine" })).not.toBeInTheDocument();
  });
});