import React, { createContext, useContext, useState } from "react";

type Language = "en" | "ta";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  "nav.home": { en: "Home", ta: "முகப்பு" },
  "nav.services": { en: "Services", ta: "சேவைகள்" },
  "nav.about": { en: "About", ta: "எங்களைப் பற்றி" },
  "nav.homeVisit": { en: "Home Visit", ta: "வீட்டு சேவை" },
  "nav.testimonials": { en: "Testimonials", ta: "சான்றுகள்" },
  "nav.contact": { en: "Contact", ta: "தொடர்பு" },
  "nav.bookAppointment": { en: "Book Appointment", ta: "முன்பதிவு செய்யுங்கள்" },
  "hero.tagline": { en: "One Stop for All Dental Solutions", ta: "அனைத்து பல் சிகிச்சைகளுக்கும் ஒரே இடம்" },
  "hero.subtitle": { en: "Experience world-class multispeciality dental care at West Mambalam, Chennai. Led by Dr. Karthik Srinivasan.", ta: "மேற்கு மாம்பலம், சென்னையில் உலகத்தரம் வாய்ந்த பல் சிகிச்சை. டாக்டர் கார்த்திக் ஸ்ரீனிவாசன் தலைமையில்." },
  "hero.cta": { en: "Book Your Appointment", ta: "உங்கள் முன்பதிவை பதிவு செய்யுங்கள்" },
  "hero.callNow": { en: "Call Now", ta: "இப்போது அழைக்கவும்" },
  "services.title": { en: "Our Services", ta: "எங்கள் சேவைகள்" },
  "services.subtitle": { en: "Comprehensive dental care with advanced technology", ta: "நவீன தொழில்நுட்பத்துடன் முழுமையான பல் சிகிச்சை" },
  "about.title": { en: "Meet Dr. Karthik Srinivasan", ta: "டாக்டர் கார்த்திக் ஸ்ரீனிவாசனை சந்தியுங்கள்" },
  "about.designation": { en: "BDS, MDS - Founder & Lead Dentist", ta: "BDS, MDS - நிறுவனர் & தலைமை பல் மருத்துவர்" },
  "about.bio": { en: "Dr. Karthik Srinivasan is the founder of Tooth Haven Multispeciality Dental Care. With years of experience in advanced dental procedures, he leads a team of specialists committed to providing exceptional dental care using state-of-the-art technology including CBCT imaging, digital smile design, and minimally invasive techniques.", ta: "டாக்டர் கார்த்திக் ஸ்ரீனிவாசன் டூத் ஹேவன் மல்டிஸ்பெஷாலிட்டி டென்டல் கேரின் நிறுவனர். மேம்பட்ட பல் சிகிச்சைகளில் பல வருட அனுபவத்துடன், CBCT இமேஜிங், டிஜிட்டல் ஸ்மைல் டிசைன் உள்ளிட்ட நவீன தொழில்நுட்பங்களைப் பயன்படுத்தி சிறந்த பல் சிகிச்சை அளிக்கும் நிபுணர் குழுவை இவர் வழிநடத்துகிறார்." },
  "homeVisit.title": { en: "Home Visit - Mobile Dental Care", ta: "வீட்டு சேவை - நடமாடும் பல் சிகிச்சை" },
  "homeVisit.subtitle": { en: "Quality dental care at your doorstep for those who need it most", ta: "உங்கள் வீட்டிலேயே தரமான பல் சிகிச்சை" },
  "homeVisit.eligible": { en: "Eligibility Criteria", ta: "தகுதி அளவுகோல்கள்" },
  "homeVisit.elderly": { en: "Elderly patients with restricted mobility", ta: "நடமாட இயலாத முதியோர்" },
  "homeVisit.bedbound": { en: "Bed-bound patients", ta: "படுக்கையில் இருக்கும் நோயாளிகள்" },
  "homeVisit.disabled": { en: "Patients with physical disabilities", ta: "உடல் ஊனமுற்ற நோயாளிகள்" },
  "homeVisit.cta": { en: "Book Home Visit", ta: "வீட்டு சேவை முன்பதிவு" },
  "testimonials.title": { en: "Patient Testimonials", ta: "நோயாளிகளின் அனுபவங்கள்" },
  "testimonials.subtitle": { en: "Real stories from our happy patients", ta: "மகிழ்ச்சியான நோயாளிகளின் உண்மையான கதைகள்" },
  "contact.title": { en: "Contact Us", ta: "எங்களை தொடர்பு கொள்ளுங்கள்" },
  "contact.address": { en: "West Mambalam, Chennai", ta: "மேற்கு மாம்பலம், சென்னை" },
  "contact.hours": { en: "Mon - Sat: 11 AM - 2 PM, 6 PM - 9 PM", ta: "திங்கள் - சனி: காலை 11 - மதியம் 2, மாலை 6 - இரவு 9" },
  "contact.sunday": { en: "Sunday: By Prior Appointment Only", ta: "ஞாயிறு: முன்பதிவு மூலம் மட்டுமே" },
  "contact.email": { en: "Email", ta: "மின்னஞ்சல்" },
  "footer.tagline": { en: "One Stop for All Dental Solutions", ta: "அனைத்து பல் சிகிச்சைகளுக்கும் ஒரே இடம்" },
  "footer.rights": { en: "All Rights Reserved", ta: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை" },
  "appointment.title": { en: "Book an Appointment", ta: "முன்பதிவு செய்யுங்கள்" },
  "appointment.name": { en: "Full Name", ta: "முழு பெயர்" },
  "appointment.phone": { en: "Phone Number", ta: "தொலைபேசி எண்" },
  "appointment.date": { en: "Preferred Date", ta: "விரும்பும் தேதி" },
  "appointment.service": { en: "Select Service", ta: "சேவையைத் தேர்ந்தெடுக்கவும்" },
  "appointment.submit": { en: "Request Appointment", ta: "முன்பதிவு கோரிக்கை" },
  "appointment.message": { en: "Message (Optional)", ta: "செய்தி (விருப்பம்)" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>("en");
  const t = (key: string) => translations[key]?.[lang] || key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
