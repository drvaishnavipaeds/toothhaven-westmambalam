import { supabase } from "@/integrations/supabase/client";

export interface DirectoryPatient {
  id: string;
  name: string;
  phone: string;
  date_of_birth: string | null;
  gender?: string | null;
  patient_code?: string | null;
  registered_on?: string | null;
  created_at?: string;
  is_returning?: boolean;
}

export const normalizedPatientName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
export const patientPhoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-10);
export function samePatient(a: Pick<DirectoryPatient, "name" | "phone">, b: Pick<DirectoryPatient, "name" | "phone">) {
  return normalizedPatientName(a.name) === normalizedPatientName(b.name) && patientPhoneKey(a.phone) === patientPhoneKey(b.phone);
}
export function patientAge(dob: string | null, today = new Date()) {
  if (!dob) return null;
  const birth = new Date(`${dob}T00:00:00`);
  if (!Number.isFinite(birth.getTime()) || birth > today) return null;
  const age = today.getFullYear() - birth.getFullYear();
  return age - Number(today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()));
}
export function patientRegistrationDate(patient: Pick<DirectoryPatient, "registered_on" | "created_at">) {
  return patient.registered_on || patient.created_at?.slice(0, 10) || "Not recorded";
}
export function patientVisitStatus(isReturning?: boolean) {
  return isReturning ? "Returning patient" : "New patient · no completed visit recorded";
}
export async function loadPatientDirectory(): Promise<DirectoryPatient[]> {
  const rows: DirectoryPatient[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("patients").select("id,name,phone,date_of_birth,gender,patient_code,registered_on,created_at").order("name").order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const visited = new Set<string>();
  for (const table of ["appointments", "treatments"] as const) {
    for (let offset = 0; ; offset += 500) {
      let query = supabase.from(table).select("patient_id").order("id").range(offset, offset + 499);
      query = query.eq("status", "completed");
      const { data, error } = await query;
      if (error) throw error;
      for (const row of data ?? []) if (row.patient_id) visited.add(row.patient_id);
      if (!data || data.length < 500) break;
    }
  }
  return rows.map(patient => ({ ...patient, is_returning: visited.has(patient.id) }));
}