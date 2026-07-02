import SimpleCrud from "./SimpleCrud";

const fmtMoney = (v: any) => v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

export const TreatmentsManager = () => (
  <SimpleCrud
    title="Treatments"
    description="Standard treatment catalog with default pricing."
    table="treatment_catalog"
    orderBy={{ column: "name", ascending: true }}
    defaultValues={{ is_active: true, duration_minutes: 30 }}
    fields={[
      { name: "name", label: "Name", required: true },
      { name: "category", label: "Category", placeholder: "e.g. Restorative" },
      { name: "default_price", label: "Price (₹)", type: "number", formatter: fmtMoney },
      { name: "duration_minutes", label: "Duration (min)", type: "number" },
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
      { name: "is_active", label: "Active", type: "boolean" },
    ]}
  />
);

export const MembershipsManager = () => (
  <SimpleCrud
    title="Memberships"
    description="Prepaid plans offered to patients."
    table="memberships"
    orderBy={{ column: "created_at" }}
    defaultValues={{ is_active: true, validity_days: 365 }}
    fields={[
      { name: "name", label: "Plan Name", required: true },
      { name: "price", label: "Price (₹)", type: "number", formatter: fmtMoney },
      { name: "validity_days", label: "Validity (days)", type: "number" },
      { name: "included_services", label: "Included Services", type: "textarea", hideInTable: true },
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
      { name: "is_active", label: "Active", type: "boolean" },
    ]}
  />
);

export const ExpensesManager = () => (
  <SimpleCrud
    title="Expenses"
    description="Track clinic operating expenses."
    table="expenses"
    orderBy={{ column: "expense_date" }}
    fields={[
      { name: "expense_date", label: "Date", type: "date", required: true },
      { name: "category", label: "Category", type: "select", required: true, options: [
        { label: "Rent", value: "rent" }, { label: "Utilities", value: "utilities" },
        { label: "Salaries", value: "salaries" }, { label: "Supplies", value: "supplies" },
        { label: "Marketing", value: "marketing" }, { label: "Equipment", value: "equipment" },
        { label: "Other", value: "other" },
      ]},
      { name: "vendor", label: "Vendor" },
      { name: "amount", label: "Amount (₹)", type: "number", required: true, formatter: fmtMoney },
      { name: "payment_mode", label: "Mode", type: "select", options: [
        { label: "Cash", value: "cash" }, { label: "UPI", value: "upi" },
        { label: "Card", value: "card" }, { label: "Bank Transfer", value: "bank" },
      ]},
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
    ]}
  />
);

export const InventoryManager = () => (
  <SimpleCrud
    title="Inventory"
    description="Track stock levels and reorder alerts."
    table="inventory"
    orderBy={{ column: "name", ascending: true }}
    defaultValues={{ unit: "pcs", quantity: 0, reorder_level: 5 }}
    fields={[
      { name: "name", label: "Item", required: true },
      { name: "category", label: "Category" },
      { name: "quantity", label: "Qty", type: "number",
        formatter: (v, row) => `${v} ${row?.unit ?? ""}${Number(v) <= Number(row?.reorder_level ?? 0) ? "  ⚠️" : ""}` },
      { name: "unit", label: "Unit" },
      { name: "reorder_level", label: "Reorder Level", type: "number", hideInTable: true },
      { name: "unit_cost", label: "Unit Cost (₹)", type: "number", hideInTable: true },
      { name: "expiry_date", label: "Expiry", type: "date" },
      { name: "supplier", label: "Supplier", hideInTable: true },
    ]}
  />
);

export const TutorialsManager = () => (
  <SimpleCrud
    title="Tutorials"
    description="Knowledge base for staff onboarding."
    table="tutorials"
    orderBy={{ column: "created_at" }}
    fields={[
      { name: "title", label: "Title", required: true },
      { name: "category", label: "Category" },
      { name: "content_type", label: "Type", type: "select", options: [
        { label: "Link", value: "link" }, { label: "Video", value: "video" }, { label: "Document", value: "document" },
      ]},
      { name: "url", label: "URL" },
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
    ]}
  />
);

export const BranchesManager = () => (
  <SimpleCrud
    title="Branches"
    description="Manage clinic locations."
    table="branches"
    orderBy={{ column: "name", ascending: true }}
    defaultValues={{ is_active: true }}
    fields={[
      { name: "name", label: "Branch Name", required: true },
      { name: "in_charge", label: "In-charge" },
      { name: "phone", label: "Phone" },
      { name: "address", label: "Address", type: "textarea", hideInTable: true },
      { name: "is_active", label: "Active", type: "boolean" },
    ]}
  />
);

export const StaffManager = () => (
  <SimpleCrud
    title="Staff"
    description="Manage clinic staff and roles."
    table="staff"
    orderBy={{ column: "name", ascending: true }}
    defaultValues={{ status: "active" }}
    fields={[
      { name: "name", label: "Name", required: true },
      { name: "role", label: "Role", type: "select", required: true, options: [
        { label: "Dentist", value: "dentist" }, { label: "Assistant", value: "assistant" },
        { label: "Receptionist", value: "receptionist" }, { label: "Hygienist", value: "hygienist" },
        { label: "Manager", value: "manager" }, { label: "Other", value: "other" },
      ]},
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email", hideInTable: true },
      { name: "join_date", label: "Joined", type: "date" },
      { name: "status", label: "Status", type: "select", options: [
        { label: "Active", value: "active" }, { label: "On leave", value: "on_leave" }, { label: "Inactive", value: "inactive" },
      ]},
    ]}
  />
);

export const CommunicationManager = () => (
  <SimpleCrud
    title="Communication"
    description="Bulk messaging campaigns (WhatsApp / SMS / Email)."
    table="communication_campaigns"
    orderBy={{ column: "created_at" }}
    defaultValues={{ status: "draft" }}
    fields={[
      { name: "name", label: "Campaign", required: true },
      { name: "channel", label: "Channel", type: "select", required: true, options: [
        { label: "WhatsApp", value: "whatsapp" }, { label: "SMS", value: "sms" }, { label: "Email", value: "email" },
      ]},
      { name: "audience", label: "Audience", placeholder: "e.g. all, active, cbct-cases" },
      { name: "message", label: "Message", type: "textarea", required: true, hideInTable: true },
      { name: "status", label: "Status", type: "select", options: [
        { label: "Draft", value: "draft" }, { label: "Scheduled", value: "scheduled" }, { label: "Sent", value: "sent" },
      ]},
      { name: "sent_count", label: "Sent", type: "number" },
    ]}
  />
);
