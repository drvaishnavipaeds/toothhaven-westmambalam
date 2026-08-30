import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DentalChart from "./DentalChart";
import TreatmentPlans from "./TreatmentPlans";
import TreatmentDetails from "./TreatmentDetails";
import AdminInvestigations from "./AdminInvestigations";
import PatientPrescriptions from "./PatientPrescriptions";
import PlanBilling from "./PlanBilling";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  medical_history: string | null;
  notes: string | null;
}

const PatientDetail = ({
  patient,
  onBack,
  onRegisterNew,
}: {
  patient: Patient;
  onBack: () => void;
  onRegisterNew?: () => void;
}) => {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to patients
        </button>
        {onRegisterNew && (
          <Button size="sm" variant="outline" onClick={onRegisterNew}>
            <UserPlus className="w-4 h-4 mr-1" /> Register patient
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
        <p className="text-sm text-muted-foreground">
          {patient.phone}{patient.gender ? ` · ${patient.gender}` : ""}{patient.date_of_birth ? ` · DOB ${patient.date_of_birth}` : ""}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chart">Tooth Chart</TabsTrigger>
          <TabsTrigger value="rx">Prescription</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="billing">Plan & Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
              <p><span className="text-muted-foreground">Email:</span> {patient.email || "N/A"}</p>
              <p><span className="text-muted-foreground">Gender:</span> {patient.gender || "N/A"}</p>
              <p><span className="text-muted-foreground">DOB:</span> {patient.date_of_birth || "N/A"}</p>
              <p className="col-span-2"><span className="text-muted-foreground">Address:</span> {patient.address || "N/A"}</p>
              <p className="col-span-2"><span className="text-muted-foreground">Medical History:</span> {patient.medical_history || "N/A"}</p>
              {patient.notes && <p className="col-span-2"><span className="text-muted-foreground">Notes:</span> {patient.notes}</p>}
            </div>
          </div>
          <TreatmentDetails patientId={patient.id} patientName={patient.name} />
        </TabsContent>

        <TabsContent value="chart">
          <DentalChart patientId={patient.id} />
        </TabsContent>

        <TabsContent value="rx">
          <PatientPrescriptions patientId={patient.id} patientName={patient.name} patientPhone={patient.phone} />
        </TabsContent>

        <TabsContent value="investigations">
          <AdminInvestigations patientId={patient.id} />
        </TabsContent>

        <TabsContent value="billing">
          <TreatmentPlans patientId={patient.id} patientName={patient.name} patientPhone={patient.phone} />
          <div className="mt-6">
            <PlanBilling patientId={patient.id} patientName={patient.name} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientDetail;
