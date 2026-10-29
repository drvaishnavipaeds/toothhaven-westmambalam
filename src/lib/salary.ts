export type PayType = "fixed" | "commission" | "hybrid";
export interface SalarySetting { pay_type: PayType; fixed_monthly: number; commission_percent: number }
export interface DoctorWork { collected: number; treatments: number; patients: number }
export interface SalaryResult extends DoctorWork { fixed_pay: number; commission_percent: number; commission: number; bonus: number; deductions: number; net_pay: number }

export const PAY_TYPE_LABEL: Record<PayType, string> = { fixed: "Fixed", commission: "Commission", hybrid: "Fixed + commission" };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "2026-10" → first day of the month and first day of the next (exclusive end). */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  return { start: `${y}-${pad(m)}-01`, end: `${next}-01` };
}

/** Collections come from invoice payments attributed to the treating doctor; treatments from completed appointments. */
export function summarizeWork(
  invoices: { doctor_id: string | null; amount_paid: number | string | null }[],
  appointments: { doctor_id: string | null; patient_id: string | null }[],
): Map<string, DoctorWork> {
  const work = new Map<string, DoctorWork & { ids: Set<string> }>();
  const get = (id: string) => {
    if (!work.has(id)) work.set(id, { collected: 0, treatments: 0, patients: 0, ids: new Set() });
    return work.get(id)!;
  };
  for (const inv of invoices) if (inv.doctor_id) get(inv.doctor_id).collected += Number(inv.amount_paid ?? 0);
  for (const a of appointments) {
    if (!a.doctor_id) continue;
    const w = get(a.doctor_id);
    w.treatments += 1;
    if (a.patient_id) w.ids.add(a.patient_id);
  }
  return new Map([...work].map(([id, w]) => [id, { collected: round2(w.collected), treatments: w.treatments, patients: w.ids.size }]));
}

export function calculateSalary(
  setting: SalarySetting,
  work: DoctorWork = { collected: 0, treatments: 0, patients: 0 },
  adjustments: { bonus?: number; deductions?: number } = {},
): SalaryResult {
  const fixed_pay = setting.pay_type === "commission" ? 0 : round2(Number(setting.fixed_monthly) || 0);
  const commission_percent = setting.pay_type === "fixed" ? 0 : Number(setting.commission_percent) || 0;
  const commission = round2((work.collected * commission_percent) / 100);
  const bonus = round2(Number(adjustments.bonus) || 0);
  const deductions = round2(Number(adjustments.deductions) || 0);
  return { ...work, fixed_pay, commission_percent, commission, bonus, deductions, net_pay: round2(fixed_pay + commission + bonus - deductions) };
}
