import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, User, Phone, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

const AppointmentSection = () => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", date: "", service: "", message: "" });

  const services = [
    "General Dentistry", "Dental Implants", "Root Canal", "Orthodontics",
    "Cosmetic Dentistry", "CBCT Imaging", "Pediatric Dentistry", "Oral Surgery",
    "Crowns & Bridges", "Digital Smile Design", "Home Visit"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Appointment request submitted! We'll contact you shortly.");
    setForm({ name: "", phone: "", date: "", service: "", message: "" });
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Send className="w-5 h-5" />
              {t("appointment.submit")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AppointmentSection;
