export type Vec3 = [number, number, number];
export type PlaneName = "Axial" | "Coronal" | "Sagittal";

export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec3): Vec3 => { const n = Math.hypot(...v); if (!n) throw new Error("DICOM orientation is invalid"); return [v[0] / n, v[1] / n, v[2] / n]; };

export function sliceNormal(orientation: number[]): Vec3 {
  if (orientation.length !== 6 || orientation.some(v => !Number.isFinite(v))) throw new Error("CBCT slices must include image orientation");
  return normalize(cross(orientation.slice(0, 3) as Vec3, orientation.slice(3, 6) as Vec3));
}

export function planeForNormal(normal: Vec3): PlaneName {
  const axis = normal.map(Math.abs).reduce((best, value, index, all) => value > all[best] ? index : best, 0);
  return axis === 0 ? "Sagittal" : axis === 1 ? "Coronal" : "Axial";
}

const label = (v: Vec3) => {
  const axis = v.map(Math.abs).reduce((best, value, index, all) => value > all[best] ? index : best, 0);
  return [["R", "L"], ["A", "P"], ["I", "S"]][axis][v[axis] >= 0 ? 1 : 0];
};
export const directionLabel = (v: Vec3) => label(v);

export interface GeometrySlice { orientation: number[]; position: number[] }

export function sortByGeometry<T extends GeometrySlice>(slices: T[]) {
  if (!slices.length) throw new Error("No DICOM files were supplied");
  const normal = sliceNormal(slices[0].orientation);
  const first = slices[0].orientation;
  if (slices.some(s => s.orientation.length !== 6 || s.orientation.some((v, i) => Math.abs(v - first[i]) > 0.01))) throw new Error("All CBCT slices must share the same orientation");
  if (slices.some(s => s.position.length !== 3 || s.position.some(v => !Number.isFinite(v)))) throw new Error("CBCT slices must include image position");
  const sorted = slices.map(slice => ({ slice, distance: dot(slice.position as Vec3, normal) })).sort((a, b) => a.distance - b.distance);
  const gaps = sorted.slice(1).map((item, i) => item.distance - sorted[i].distance).filter(gap => gap > 0.0001);
  if (gaps.length && Math.max(...gaps) - Math.min(...gaps) > Math.max(0.05, Math.min(...gaps) * 0.1)) throw new Error("CBCT slice spacing is irregular; export the full continuous series");
  const spacing = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  return { slices: sorted.map(item => item.slice), normal, spacing };
}