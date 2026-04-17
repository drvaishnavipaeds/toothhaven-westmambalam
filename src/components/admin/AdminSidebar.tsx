import { LayoutDashboard, Users, Calendar, IndianRupee, FileText, LogOut, Sparkles, MessageSquareQuote, Award, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useNavigate } from "react-router-dom";

export type Tab = "overview" | "patients" | "appointments" | "financials" | "content" | "case_studies" | "testimonials" | "achievements" | "consents";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "financials", label: "Financials", icon: IndianRupee },
  { id: "content", label: "Content", icon: FileText },
  { id: "case_studies", label: "Success Stories", icon: Sparkles },
  { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "consents", label: "Consents", icon: ShieldCheck },
];

const AdminSidebar = ({ activeTab, onTabChange }: Props) => {
  const { signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin");
  };

  return (
    <aside className="w-full md:w-60 bg-card border-r border-border md:min-h-screen shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-foreground">🦷 Tooth Haven</h2>
        <p className="text-xs text-muted-foreground">Admin Portal</p>
      </div>
      <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="hidden md:block mt-auto p-2 border-t border-border">
        <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
