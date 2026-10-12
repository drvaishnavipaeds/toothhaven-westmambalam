import { beforeEach, describe, expect, it, vi } from "vitest";
import { addCatalogueMedicine } from "@/lib/medicine-catalog";

const { from, query } = vi.hoisted(() => ({ from: vi.fn(), query: { select: vi.fn(), ilike: vi.fn(), order: vi.fn(), limit: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn(), upsert: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

beforeEach(() => {
  vi.resetAllMocks();
  from.mockReturnValue(query);
  for (const method of [query.select, query.ilike, query.order, query.update, query.eq]) method.mockReturnValue(query);
});

describe("new prescription medicines", () => {
  it("persists a new medicine in the shared catalogue without patient regimen defaults", async () => {
    query.limit.mockResolvedValue({ data: [], error: null });
    query.upsert.mockResolvedValue({ error: null });
    query.single.mockResolvedValue({ data: { id: "new", name: "New medicine", is_active: true }, error: null });
    const saved = await addCatalogueMedicine("  New   medicine  ");
    expect(from).toHaveBeenCalledWith("medicine_catalog");
    expect(query.upsert).toHaveBeenCalledWith({ name: "New medicine", strength: "", form: "", is_active: true }, { onConflict: "name,strength,form", ignoreDuplicates: true });
    expect(saved.name).toBe("New medicine");
  });
  it("reuses an existing medicine instead of adding it again", async () => {
    const existing = { id: "existing", name: "Paracetamol", is_active: true };
    query.limit.mockResolvedValue({ data: [existing], error: null });
    expect(await addCatalogueMedicine("Paracetamol")).toEqual(existing);
    expect(query.upsert).not.toHaveBeenCalled();
  });
  it("reactivates a previously inactive medicine", async () => {
    query.limit.mockResolvedValue({ data: [{ id: "inactive", name: "Medicine", is_active: false }], error: null });
    query.single.mockResolvedValue({ data: { id: "inactive", name: "Medicine", is_active: true }, error: null });
    expect((await addCatalogueMedicine("Medicine")).is_active).toBe(true);
    expect(query.update).toHaveBeenCalledWith({ is_active: true });
  });
  it("rejects empty names without writing to the catalogue", async () => {
    await expect(addCatalogueMedicine("   ")).rejects.toThrow("Enter a medicine name");
    expect(from).not.toHaveBeenCalled();
  });
  it("propagates a denied save rather than selecting an unsaved medicine", async () => {
    query.limit.mockResolvedValue({ data: [], error: null });
    query.upsert.mockResolvedValue({ error: new Error("Permission denied") });
    await expect(addCatalogueMedicine("Medicine")).rejects.toThrow("Permission denied");
    expect(query.single).not.toHaveBeenCalled();
  });
});