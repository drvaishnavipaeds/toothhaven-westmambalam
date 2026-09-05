import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AboutSection from "@/components/AboutSection";
import HomeVisitSection from "@/components/HomeVisitSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AppointmentSection from "@/components/AppointmentSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import HavenAIChatbot from "@/components/HavenAIChatbot";

const Index = () => {
  return (
    <LanguageProvider>
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <HomeVisitSection />
        <TestimonialsSection />
        <AppointmentSection />
        <ContactSection />
      </main>
      <Footer />
      <HavenAIChatbot />
    </LanguageProvider>
  );
};

export default Index;
