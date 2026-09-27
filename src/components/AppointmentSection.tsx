import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppointmentSection = () => {
  const { lang, t } = useLanguage();

  return (
    <section id="appointment" className="relative bg-gradient-hero py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">{t("appointment.title")}</h2>
        <p className="mx-auto mb-7 max-w-lg text-primary-foreground/90">
          {lang === "en"
            ? "Sign in or register to choose an available date and time from Dr. Karthik’s calendar. The clinic will review your request."
            : "டாக்டர் கார்த்திக்கின் காலெண்டரில் கிடைக்கும் தேதி மற்றும் நேரத்தைத் தேர்ந்தெடுக்க உள்நுழையவும் அல்லது பதிவு செய்யவும். உங்கள் கோரிக்கையை மருத்துவமனை பரிசீலிக்கும்."}
        </p>
        <Button asChild size="lg" variant="secondary" className="gap-2">
          <Link to="/patient-portal"><CalendarDays className="h-5 w-5" />{t("appointment.submit")}</Link>
        </Button>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-primary-foreground/80">
          <LockKeyhole className="h-4 w-4" />
          {lang === "en" ? "Your records and appointment requests stay in your patient account." : "உங்கள் பதிவுகளும் முன்பதிவு கோரிக்கைகளும் உங்கள் நோயாளி கணக்கில் இருக்கும்."}
        </p>
      </div>
    </section>
  );
};

export default AppointmentSection;