import { useState } from "react";
import {
  LayoutDashboard, Users, Calendar, IndianRupee, FileText, LogOut, Sparkles, MessageSquareQuote,
  Award, ShieldCheck, Stethoscope, Pill, Receipt, CreditCard, TrendingDown, Package, GraduationCap,
  BarChart3, UserCog, Building2, ScrollText, Send, Settings, ChevronDown, ChevronRight, Inbox,
  CalendarClock, ListChecks, BellRing, MessageSquare,

} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useNavigate } from "react-router-dom";
import logoAsset from "@/assets/tooth-haven-logo.png.asset.json";

export type Tab =
  | "overview" | "patients" | "appointments" | "schedule" | "waitlist" | "recalls" | "treatments"
  | "prescriptions" | "invoices"
  | "memberships" | "expenses" | "inventory" | "tutorials" | "reports" | "staff" | "branches"
  | "audit_logs" | "communication" | "whatsapp_inbox" | "settings" | "financials" | "content" | "case_studies"
  | "testimonials" | "achievements" | "consents" | "approvals";


interface Props { activeTab: Tab; onTabChange: (tab: Tab) => void; }

const groups: { label: string; items: { id: Tab; label: string; icon: any }[] }[] = [
  { label: "Main", items: [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ]},
  { label: "Clinical", items: [
    { id: "patients", label: "Patients", icon: Users },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "schedule", label: "Schedule", icon: CalendarClock },
    { id: "waitlist", label: "Waitlist", icon: ListChecks },
    { id: "recalls", label: "Recalls", icon: BellRing },
    { id: "treatments", label: "Treatments", icon: Stethoscope },
    { id: "prescriptions", label: "Prescriptions", icon: Pill },
  ]},

  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "financials", label: "Payments", icon: IndianRupee },
    { id: "memberships", label: "Memberships", icon: CreditCard },
    { id: "expenses", label: "Expenses", icon: TrendingDown },
  ]},
  { label: "Operations", items: [
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "staff", label: "Staff", icon: UserCog },
    { id: "branches", label: "Branches", icon: Building2 },
    { id: "tutorials", label: "Tutorials", icon: GraduationCap },
    { id: "communication", label: "Communication", icon: Send },
    { id: "whatsapp_inbox", label: "WhatsApp Inbox", icon: MessageSquare },
  ]},
  { label: "Marketing", items: [
    { id: "approvals", label: "Approvals", icon: Inbox },
    { id: "content", label: "Content", icon: FileText },
    { id: "case_studies", label: "Success Stories", icon: Sparkles },
    { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
    { id: "achievements", label: "Achievements", icon: Award },
  ]},
  { label: "System", items: [
    { id: "consents", label: "Consents", icon: ShieldCheck },
    { id: "audit_logs", label: "Audit Logs", icon: ScrollText },
    { id: "settings", label: "Settings", icon: Settings },
  ]},
];

const AdminSidebar = ({ activeTab, onTabChange }: Props) => {
  const { signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleSignOut = async () => { await signOut(); navigate("/admin"); };

  return (
    <aside className="w-full md:w-60 bg-card border-r border-border md:min-h-screen md:max-h-screen md:overflow-y-auto shrink-0">
      <div className="p-4 border-b border-border sticky top-0 bg-card z-10 flex items-center gap-3">
        <img src={logoAsset.url} alt="Tooth Haven" className="h-10 w-auto" />
        <div>
          <h2 className="font-bold text-foreground text-sm leading-tight">Tooth Haven</h2>
          <p className="text-xs text-muted-foreground">Admin Portal</p>
        </div>
      </div>
      <nav className="p-2 space-y-2">
        {groups.map((g) => {
          const isOpen = !collapsed[g.label];
          return (
            <div key={g.label}>
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [g.label]: !c[g.label] }))}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
              >
                <span>{g.label}</span>
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isOpen && (
                <div className="mt-1 space-y-0.5">
                  {g.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => onTabChange(id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeTab === id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-2 border-t border-border sticky bottom-0 bg-card">
        <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
