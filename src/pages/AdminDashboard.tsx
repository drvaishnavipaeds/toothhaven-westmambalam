import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
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
        {activeTab === "case_studies" && <CaseStudiesManager />}
        {activeTab === "testimonials" && <TestimonialsManager />}
        {activeTab === "achievements" && <AchievementsManager />}
        {activeTab === "consents" && <ConsentManager />}
      </main>
    </div>
  );
};

export default AdminDashboard;
