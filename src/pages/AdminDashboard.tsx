import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Home, LogOut, UserCircle } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar, { Tab } from "@/components/admin/AdminSidebar";
import DashboardOverview from "@/components/admin/DashboardOverview";
import PatientsList from "@/components/admin/PatientsList";
import AppointmentsList from "@/components/admin/AppointmentsList";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import ContentManager from "@/components/admin/ContentManager";
import CaseStudiesManager from "@/components/admin/CaseStudiesManager";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import AchievementsManager from "@/components/admin/AchievementsManager";
import ConsentManager from "@/components/admin/ConsentManager";
import PrescriptionsManager from "@/components/admin/PrescriptionsManager";
import InvoicesManager from "@/components/admin/InvoicesManager";
import ReportsManager from "@/components/admin/ReportsManager";
import AuditLogsManager from "@/components/admin/AuditLogsManager";
import SettingsManager from "@/components/admin/SettingsManager";
import {
  TreatmentsManager, MembershipsManager, ExpensesManager, InventoryManager,
  TutorialsManager, BranchesManager, StaffManager, CommunicationManager,
} from "@/components/admin/SimpleModules";

const AdminDashboard = () => {
  const { user, isAdmin, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {activeTab === "overview" && <DashboardOverview />}
        {activeTab === "reports" && <ReportsManager />}
        {activeTab === "patients" && <PatientsList />}
        {activeTab === "appointments" && <AppointmentsList />}
        {activeTab === "treatments" && <TreatmentsManager />}
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
        {activeTab === "content" && <ContentManager />}
        {activeTab === "case_studies" && <CaseStudiesManager />}
        {activeTab === "testimonials" && <TestimonialsManager />}
        {activeTab === "achievements" && <AchievementsManager />}
        {activeTab === "consents" && <ConsentManager />}
        {activeTab === "audit_logs" && <AuditLogsManager />}
        {activeTab === "settings" && <SettingsManager />}
      </main>
    </div>
  );
};

export default AdminDashboard;
