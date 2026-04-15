import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardOverview from "@/components/admin/DashboardOverview";
import PatientsList from "@/components/admin/PatientsList";
import AppointmentsList from "@/components/admin/AppointmentsList";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import ContentManager from "@/components/admin/ContentManager";

type Tab = "overview" | "patients" | "appointments" | "financials" | "content";

const AdminDashboard = () => {
  const { user, isAdmin, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {activeTab === "overview" && <DashboardOverview />}
        {activeTab === "patients" && <PatientsList />}
        {activeTab === "appointments" && <AppointmentsList />}
        {activeTab === "financials" && <FinancialDashboard />}
        {activeTab === "content" && <ContentManager />}
      </main>
    </div>
  );
};

export default AdminDashboard;
