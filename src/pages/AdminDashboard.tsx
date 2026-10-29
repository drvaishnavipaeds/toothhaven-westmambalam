import { useEffect, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Home, LogOut, UserCircle } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar, { Tab } from "@/components/admin/AdminSidebar";
import MobileAdminNavigation from "@/components/admin/MobileAdminNavigation";
import AdminCommandBar from "@/components/admin/AdminCommandBar";
import AdminAppLock from "@/components/admin/AdminAppLock";
import { supabase } from "@/integrations/supabase/client";
import { isAdminPushSubscribed, subscribeAdminPush } from "@/lib/web-push";
import { toast } from "@/hooks/use-toast";
import DashboardOverview from "@/components/admin/DashboardOverview";
import PatientsList from "@/components/admin/PatientsList";
import AppointmentsList from "@/components/admin/AppointmentsList";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import ContentManager from "@/components/admin/ContentManager";
import CaseStudiesManager from "@/components/admin/CaseStudiesManager";
import ApprovalsManager from "@/components/admin/ApprovalsManager";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import AchievementsManager from "@/components/admin/AchievementsManager";
import ConsentManager from "@/components/admin/ConsentManager";
import PrescriptionsManager from "@/components/admin/PrescriptionsManager";
import InvoicesManager from "@/components/admin/InvoicesManager";
import ScheduleManager from "@/components/admin/ScheduleManager";
import WaitlistManager from "@/components/admin/WaitlistManager";
import RecallsManager from "@/components/admin/RecallsManager";
import WhatsAppInbox from "@/components/admin/WhatsAppInbox";
import CampaignsManager from "@/components/admin/CampaignsManager";

import ReportsManager from "@/components/admin/ReportsManager";
import AuditLogsManager from "@/components/admin/AuditLogsManager";
import SettingsManager from "@/components/admin/SettingsManager";
import StaffAccessManager from "@/components/admin/StaffAccessManager";
import FollowupsManager from "@/components/admin/FollowupsManager";
import { LanguageProvider } from "@/contexts/LanguageContext";
import {
  TreatmentsManager, MedicinesManager, ClinicalTemplatesManager, MembershipsManager, ExpensesManager, InventoryManager,
   TutorialsManager, BranchesManager, CommunicationManager,
} from "@/components/admin/SimpleModules";

const AdminDashboard = () => {
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPatientId, setOpenPatientId] = useState<string | null>(null);
  const [registerRequested, setRegisterRequested] = useState(false);
  const [addRequested, setAddRequested] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const appointmentId = params.get("appointment") ?? undefined;
  useEffect(() => { const t = params.get("tab"); if (appointmentId) setActiveTab("appointments"); else if (t) setActiveTab(t as Tab); }, [params, appointmentId]);

  useEffect(() => {
    if (!isAdmin) return;
    let first = true;
    let last = { pending: 0, messages: 0 };
    const alert = (title: string, body: string, tab: Tab) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (document.visibilityState === "visible" && document.hasFocus()) return;
      const n = new Notification(title, { body, icon: "/admin-icon-192.png", tag: `th-${tab}` });
      n.onclick = () => { window.focus(); setActiveTab(tab); n.close(); };
    };
    const refresh = async () => {
      const [{ count: pending }, { count: messages }] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).in("status", ["pending", "conflict"]),
        supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("direction", "inbound").eq("handled_by_staff", false),
      ]);
      const next = { pending: pending ?? 0, messages: messages ?? 0 };
      if (!first) {
        if (next.pending > last.pending) alert("New appointment request", `${next.pending} awaiting review`, "appointments");
        if (next.messages > last.messages) alert("New patient message", `${next.messages} unread WhatsApp messages`, "whatsapp_inbox");
      }
      first = false;
      last = next;
      setPendingCount(next.pending);
      setMessageCount(next.messages);
      const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
      const total = next.pending + next.messages;
      try { if (total > 0) await nav.setAppBadge?.(total); else await nav.clearAppBadge?.(); } catch { /* unsupported */ }
    };
    let debounce: number | undefined;
    const soon = () => { window.clearTimeout(debounce); debounce = window.setTimeout(() => void refresh(), 800); };
    const channel = supabase
      .channel("admin-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, soon)
      .subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(debounce);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const [notifyPermission, setNotifyPermission] = useState<string>(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false); const off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  const [pushOn, setPushOn] = useState(true);
  useEffect(() => { isAdminPushSubscribed().then(setPushOn).catch(() => setPushOn(false)); }, []);
  const enableAlerts = async () => {
    const res = await subscribeAdminPush();
    if ("Notification" in window) setNotifyPermission(Notification.permission);
    setPushOn(res.ok);
    toast({ title: res.ok ? "Alerts are on for this device" : "Alerts not turned on", description: res.ok ? "You'll get alerts even when the app is closed." : res.reason });
  };

  const commandBar = <AdminCommandBar onNavigate={setActiveTab} onOpenPatient={(id) => { setOpenPatientId(id); setActiveTab("patients"); }} onRegisterPatient={() => { setRegisterRequested(true); setActiveTab("patients"); }} onAddAppointment={() => { setAddRequested(true); setActiveTab("appointments"); }} />;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  }
  if (!user || !isAdmin) return <Navigate to={`/admin?${params.toString()}`} replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
        <MobileAdminNavigation activeTab={activeTab} onTabChange={setActiveTab} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} pendingCount={pendingCount} messageCount={messageCount} actions={commandBar} />
        <div className="hidden md:flex sticky top-0 z-30 items-center justify-end gap-2 bg-background/95 backdrop-blur border-b border-border px-4 py-2">
          {commandBar}
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
          <Link to="/patient-portal" className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
            <UserCircle className="w-3.5 h-3.5" /> Patient Portal
          </Link>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
        <div className="p-3 sm:p-4 md:p-6">
        <AdminAppLock />
        {offline && <div role="status" className="mb-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">You're offline. Showing the saved app; changes and new data will load when the connection returns.</div>}
        {(notifyPermission === "default" || (notifyPermission === "granted" && !pushOn)) && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Get phone alerts for new appointment requests and patient messages, even when the app is closed.</span>
            <button onClick={enableAlerts} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Turn on alerts</button>
          </div>
        )}
        {activeTab === "overview" && <DashboardOverview onNavigate={setActiveTab} />}
        {activeTab === "reports" && <ReportsManager />}
        {activeTab === "patients" && <PatientsList initialPatientId={openPatientId} registerRequested={registerRequested} onRequestHandled={() => { setOpenPatientId(null); setRegisterRequested(false); }} />}
        {activeTab === "appointments" && <AppointmentsList initialAppointmentId={appointmentId} addRequested={addRequested} onRequestHandled={() => setAddRequested(false)} />}
        {activeTab === "schedule" && <ScheduleManager />}
        {activeTab === "waitlist" && <WaitlistManager />}
        {activeTab === "recalls" && <RecallsManager />}
        {activeTab === "followups" && <FollowupsManager />}

        {activeTab === "treatments" && <TreatmentsManager />}
        {activeTab === "medicines" && <MedicinesManager />}
        {activeTab === "clinical_templates" && <ClinicalTemplatesManager />}
        {activeTab === "prescriptions" && <PrescriptionsManager />}
        {activeTab === "invoices" && <InvoicesManager />}
        {activeTab === "financials" && <FinancialDashboard />}
        {activeTab === "memberships" && <MembershipsManager />}
        {activeTab === "expenses" && <ExpensesManager />}
        {activeTab === "inventory" && <InventoryManager />}
        {activeTab === "staff" && <LanguageProvider><StaffAccessManager /></LanguageProvider>}
        {activeTab === "branches" && <BranchesManager />}
        {activeTab === "tutorials" && <TutorialsManager />}
        {activeTab === "communication" && <CommunicationManager />}
        {activeTab === "whatsapp_inbox" && <WhatsAppInbox />}
        {activeTab === "campaigns" && <CampaignsManager />}
        {activeTab === "content" && <ContentManager />}
        {activeTab === "approvals" && <ApprovalsManager />}
        {activeTab === "case_studies" && <CaseStudiesManager />}
        {activeTab === "testimonials" && <TestimonialsManager />}
        {activeTab === "achievements" && <AchievementsManager />}
        {activeTab === "consents" && <ConsentManager />}
        {activeTab === "audit_logs" && <AuditLogsManager />}
        {activeTab === "settings" && <SettingsManager />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
