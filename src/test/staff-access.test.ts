import { describe, expect, it } from "vitest";
import { canManageStaff, validateStaffChange } from "../../supabase/functions/_shared/staff-access";

const valid = { name: "Clinic staff", email: "staff@example.com", role: "receptionist", status: "active", reason: "Assigned reception duty" };
describe("Staff access rules", () => {
  it("only active owners can assign roles", () => {
    expect(canManageStaff(["owner"], true)).toBe(true);
    for (const role of ["dentist", "receptionist", "assistant"]) expect(canManageStaff([role], true)).toBe(false);
    expect(canManageStaff(["owner"], false)).toBe(false);
  });
  it("accepts the four supported roles and rejects invented privileges", () => {
    for (const role of ["owner", "dentist", "receptionist", "assistant"]) expect(validateStaffChange({ ...valid, role })).toBeNull();
    expect(validateStaffChange({ ...valid, role: "superadmin" })).not.toBeNull();
  });
  it("requires a reason for access changes", () => {
    expect(validateStaffChange({ ...valid, reason: " " })).not.toBeNull();
    expect(validateStaffChange(valid)).toBeNull();
  });
  it("rejects invalid statuses and identifiers", () => {
    expect(validateStaffChange({ ...valid, status: "enabled" })).not.toBeNull();
    expect(validateStaffChange({ ...valid, branch_id: "foreign-branch" })).not.toBeNull();
  });
});