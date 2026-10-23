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
export async function loadPatientDirectory(): Promise<DirectoryPatient[]> {
  const rows: DirectoryPatient[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("patients").select("id,name,phone,date_of_birth,gender,patient_code,registered_on,created_at").order("name").order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}