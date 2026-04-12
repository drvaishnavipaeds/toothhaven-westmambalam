import { useState } from "react";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Search, Calendar, User, Clock, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PatientPortalContent = () => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data: patients } = await supabase
      .from("patients")
      .select("*")
      .eq("phone", phone.trim());

    if (patients && patients.length > 0) {
      const p = patients[0];
      setPatient(p);

      const [apptRes, treatRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("patient_id", p.id).order("appointment_date", { ascending: false }),
        supabase.from("treatments").select("*").eq("patient_id", p.id).order("treatment_date", { ascending: false }),
      ]);

      setAppointments(apptRes.data || []);
      setTreatments(treatRes.data || []);
    } else {
      setPatient(null);
      setAppointments([]);
      setTreatments([]);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Patient Portal</h1>
            <p className="text-muted-foreground">View your appointments and treatment history</p>
          </div>

          {/* Phone Lookup */}
          <div className="bg-card rounded-2xl p-6 shadow-elevated mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Enter your registered phone number
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="e.g. 9841703037"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Search className="w-5 h-5" />
                Search
              </button>
            </div>
          </div>

          {/* Results */}
          {searched && !loading && !patient && (
            <div className="bg-card rounded-2xl p-8 shadow-elevated text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground mb-2">No patient found</p>
              <p className="text-muted-foreground text-sm mb-4">
                This phone number is not registered. You can book an appointment below.
              </p>
              <a
                href="/#appointment"
                className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90"
              >
                <Calendar className="w-5 h-5" />
                Book Appointment
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          )}

          {patient && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-card rounded-2xl p-6 shadow-elevated">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{patient.name}</h2>
                    <p className="text-muted-foreground">{patient.phone}</p>
                  </div>
                </div>
                {patient.email && (
                  <p className="text-sm text-muted-foreground">Email: {patient.email}</p>
                )}
              </div>

              {/* Appointments */}
              <div className="bg-card rounded-2xl p-6 shadow-elevated">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Appointments
                </h3>
                {appointments.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-3">No appointments yet</p>
                    <a
                      href="/#appointment"
                      className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                    >
                      Book your first appointment <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-foreground">{a.treatment_type || "General"}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {a.appointment_date} at {a.appointment_time}
                          </p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          a.status === "completed" ? "bg-green-100 text-green-700" :
                          a.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                          a.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Treatment History */}
              <div className="bg-card rounded-2xl p-6 shadow-elevated">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Treatment History
                </h3>
                {treatments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No treatments recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {treatments.map((tr) => (
                      <div key={tr.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-foreground">{tr.treatment_name}</p>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            tr.status === "completed" ? "bg-green-100 text-green-700" :
                            tr.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {tr.status}
                          </span>
                        </div>
                        {tr.tooth_number && (
                          <p className="text-sm text-muted-foreground">Tooth: {tr.tooth_number}</p>
                        )}
                        {tr.description && (
                          <p className="text-sm text-muted-foreground mt-1">{tr.description}</p>
                        )}
                        {tr.treatment_date && (
                          <p className="text-xs text-muted-foreground mt-1">Date: {tr.treatment_date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

const PatientPortal = () => (
  <LanguageProvider>
    <PatientPortalContent />
  </LanguageProvider>
);

export default PatientPortal;
