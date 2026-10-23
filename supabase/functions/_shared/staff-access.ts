export const STAFF_ROLES = ["owner", "dentist", "receptionist", "assistant"] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export function canManageStaff(roles: string[], active: boolean): boolean {
  return active && roles.includes("owner");
}

export function validateStaffChange(input: Record<string, unknown>): string | null {
  if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 100) return "Enter a staff name (2–100 characters).";
  if (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254) return "Enter a valid login email.";
  if (!STAFF_ROLES.some(role => role === input.role)) return "Select a valid staff role.";
  if (!["active", "on_leave", "inactive"].includes(String(input.status))) return "Select a valid status.";
  if (typeof input.reason !== "string" || input.reason.trim().length < 3 || input.reason.length > 500) return "Enter a reason for this access change.";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const key of ["id", "branch_id"]) {
    if (input[key] != null && (typeof input[key] !== "string" || !uuid.test(String(input[key])))) return "Invalid staff or branch selection.";
  }
  if (input.phone != null && (typeof input.phone !== "string" || input.phone.length > 20)) return "Enter a valid phone number.";
  return null;
}