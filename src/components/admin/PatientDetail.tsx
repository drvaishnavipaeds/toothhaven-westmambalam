import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DentalChart from "./DentalChart";
import TreatmentPlans from "./TreatmentPlans";
import TreatmentDetails from "./TreatmentDetails";
import AdminInvestigations from "./AdminInvestigations";

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
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
          <p><span className="text-muted-foreground">Email:</span> {patient.email || "N/A"}</p>
          <p><span className="text-muted-foreground">Gender:</span> {patient.gender || "N/A"}</p>
          <p><span className="text-muted-foreground">DOB:</span> {patient.date_of_birth || "N/A"}</p>
          <p className="col-span-2"><span className="text-muted-foreground">Address:</span> {patient.address || "N/A"}</p>
          <p className="col-span-2"><span className="text-muted-foreground">Medical History:</span> {patient.medical_history || "N/A"}</p>
        </div>
      </div>

      <DentalChart patientId={patient.id} />

      <TreatmentPlans patientId={patient.id} patientName={patient.name} patientPhone={patient.phone} />

      <TreatmentDetails patientId={patient.id} patientName={patient.name} />

      <AdminInvestigations patientId={patient.id} />
    </div>
  );
};

export default PatientDetail;
