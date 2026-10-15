import { describe, expect, it } from "vitest";
import { planeForNormal, sliceNormal, sortByGeometry } from "@/components/portal/dicomGeometry";

describe("CBCT orientation geometry", () => {
  it("sorts slices by position along the scan normal, not file order", () => {
    const result = sortByGeometry([{ id: 3, orientation: [1, 0, 0, 0, 1, 0], position: [0, 0, 1] }, { id: 1, orientation: [1, 0, 0, 0, 1, 0], position: [0, 0, 0] }, { id: 2, orientation: [1, 0, 0, 0, 1, 0], position: [0, 0, 0.5] }]);
    expect(result.slices.map(s => s.id)).toEqual([1, 2, 3]);
    expect(result.spacing).toBe(0.5);
  });
  it("identifies axial, coronal and sagittal planes", () => {
    expect(planeForNormal(sliceNormal([1, 0, 0, 0, 1, 0]))).toBe("Axial");
    expect(planeForNormal(sliceNormal([1, 0, 0, 0, 0, -1]))).toBe("Coronal");
    expect(planeForNormal(sliceNormal([0, 1, 0, 0, 0, -1]))).toBe("Sagittal");
  });
  it("rejects mixed orientations and missing slice gaps", () => {
    expect(() => sortByGeometry([{ orientation: [1, 0, 0, 0, 1, 0], position: [0, 0, 0] }, { orientation: [0, 1, 0, 0, 0, -1], position: [0, 0, 1] }])).toThrow("same orientation");
    expect(() => sortByGeometry([0, 1, 3].map(z => ({ orientation: [1, 0, 0, 0, 1, 0], position: [0, 0, z] })))).toThrow("irregular");
  });
});