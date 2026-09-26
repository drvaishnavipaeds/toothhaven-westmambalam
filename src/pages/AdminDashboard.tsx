import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Home, LogOut, UserCircle } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar, { Tab } from "@/components/admin/AdminSidebar";
import MobileAdminNavigation from "@/components/admin/MobileAdminNavigation";
import AdminCommandBar from "@/components/admin/AdminCommandBar";
import AdminAppLock from "@/components/admin/AdminAppLock";
import { supabase } from "@/integrations/supabase/client";
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
import {
  TreatmentsManager, MedicinesManager, ClinicalTemplatesManager, MembershipsManager, ExpensesManager, InventoryManager,
  TutorialsManager, BranchesManager, StaffManager, CommunicationManager,
} from "@/components/admin/SimpleModules";

const AdminDashboard = () => {
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPatientId, setOpenPatientId] = useState<string | null>(null);
  const [registerRequested, setRegisterRequested] = useState(false);
  const [addRequested, setAddRequested] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const refresh = async () => {
      const [{ count: pending }, { count: messages }] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).in("status", ["pending", "conflict"]),
        supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("direction", "inbound").eq("handled_by_staff", false),
      ]);
      setPendingCount(pending ?? 0);
      setMessageCount(messages ?? 0);
    };
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [isAdmin]);

  const commandBar = <AdminCommandBar onNavigate={setActiveTab} onOpenPatient={(id) => { setOpenPatientId(id); setActiveTab("patients"); }} onRegisterPatient={() => { setRegisterRequested(true); setActiveTab("patients"); }} onAddAppointment={() => { setAddRequested(true); setActiveTab("appointments"); }} />;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/admin" replace />;

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
        {activeTab === "overview" && <DashboardOverview onNavigate={setActiveTab} />}
        {activeTab === "reports" && <ReportsManager />}
        {activeTab === "patients" && <PatientsList initialPatientId={openPatientId} registerRequested={registerRequested} onRequestHandled={() => { setOpenPatientId(null); setRegisterRequested(false); }} />}
        {activeTab === "appointments" && <AppointmentsList addRequested={addRequested} onRequestHandled={() => setAddRequested(false)} />}
        {activeTab === "schedule" && <ScheduleManager />}
        {activeTab === "waitlist" && <WaitlistManager />}
        {activeTab === "recalls" && <RecallsManager />}

        {activeTab === "treatments" && <TreatmentsManager />}
        {activeTab === "medicines" && <MedicinesManager />}
        {activeTab === "clinical_templates" && <ClinicalTemplatesManager />}
        {activeTab === "prescriptions" && <PrescriptionsManager />}
        {activeTab === "invoices" && <InvoicesManager />}
        {activeTab === "financials" && <FinancialDashboard />}
        {activeTab === "memberships" && <MembershipsManager />}
        {activeTab === "expenses" && <ExpensesManager />}
        {activeTab === "inventory" && <InventoryManager />}
        {activeTab === "staff" && <StaffManager />}
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
