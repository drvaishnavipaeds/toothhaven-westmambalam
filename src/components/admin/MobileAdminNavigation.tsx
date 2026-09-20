import { CalendarDays, LayoutDashboard, Menu, MessageSquare, Settings, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AdminSidebar, { type Tab } from "@/components/admin/AdminSidebar";
import markTealAsset from "@/assets/tooth-haven-mark-teal.png.asset.json";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}

const primaryTabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "patients", label: "Patients", icon: Users },
  { id: "whatsapp_inbox", label: "Messages", icon: MessageSquare },
];

const MobileAdminNavigation = ({ activeTab, onTabChange, menuOpen, onMenuOpenChange }: Props) => {
  const changeTab = (tab: Tab) => {
    onTabChange(tab);
    onMenuOpenChange(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src={markTealAsset.url} alt="Tooth Haven" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">Tooth Haven Admin</p>
            <p className="truncate text-xs text-muted-foreground">Clinic workspace</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Open admin menu" onClick={() => onMenuOpenChange(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 grid h-[calc(4.5rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {primaryTabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            className={`h-full min-w-0 flex-col gap-1 rounded-none px-1 text-[10px] ${activeTab === id ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => changeTab(id)}
            aria-label={label}
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{label}</span>
          </Button>
        ))}
        <Button
          variant="ghost"
          className="h-full min-w-0 flex-col gap-1 rounded-none px-1 text-[10px] text-muted-foreground"
          onClick={() => onMenuOpenChange(true)}
          aria-label="More admin sections"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </Button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={onMenuOpenChange}>
        <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin sections</SheetTitle>
            <SheetDescription>Navigate to a Tooth Haven admin section.</SheetDescription>
          </SheetHeader>
          <AdminSidebar activeTab={activeTab} onTabChange={changeTab} mobile />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileAdminNavigation;