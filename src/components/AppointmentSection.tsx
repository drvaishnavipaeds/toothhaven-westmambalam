import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, User, Phone, MessageSquare, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AppointmentSection = () => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", date: "", service: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const services = [
    "General Dentistry", "Dental Implants", "Root Canal", "Orthodontics",
    "Cosmetic Dentistry", "CBCT Imaging", "Pediatric Dentistry", "Oral Surgery",
    "Crowns & Bridges", "Digital Smile Design", "Home Visit"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check if patient exists by phone
      const { data: existingPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", form.phone.trim());

      let patientId: string | null = null;

      if (existingPatients && existingPatients.length > 0) {
        patientId = existingPatients[0].id;
      }

      // Create appointment with source tracking
      const { error } = await supabase.from("appointments").insert({
        patient_id: patientId,
        patient_name: form.name,
        patient_phone: form.phone,
        appointment_date: form.date,
        appointment_time: "11:00",
        treatment_type: form.service,
        notes: form.message || null,
        status: "pending",
        source: "website",
      });

      if (error) throw error;

      // Send WhatsApp notification to primary number (8925166149)
      try {
        await supabase.functions.invoke("appointment-notification", {
          body: {
            patientName: form.name,
            patientPhone: form.phone,
            appointmentDate: form.date,
            service: form.service,
            message: form.message,
            source: "website",
          },
        });
      } catch (notifErr) {
        console.error("Notification error:", notifErr);
      }

      toast.success("Appointment request submitted! We'll contact you shortly. / முன்பதிவு கோரிக்கை சமர்ப்பிக்கப்பட்டது!");
      setForm({ name: "", phone: "", date: "", service: "", message: "" });
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="appointment" className="py-20 bg-gradient-hero relative">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">{t("appointment.title")}</h2>
          </div>
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 md:p-8 shadow-elevated space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("appointment.name")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="tel"
                placeholder={t("appointment.phone")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("appointment.service")}</option>
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <textarea
                placeholder={t("appointment.message")}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {submitting ? "Submitting..." : t("appointment.submit")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AppointmentSection;
