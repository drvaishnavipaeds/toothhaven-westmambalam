import { Helmet } from "react-helmet-async";
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
import PaymentSection from "@/components/PaymentSection";
import HavenAIChatbot from "@/components/HavenAIChatbot";

const Index = () => {
  return (
    <LanguageProvider>
      <Helmet>
        <title>Tooth Haven - Multispeciality Dental Care | West Mambalam</title>
        <meta name="description" content="Tooth Haven Multispeciality Dental Care - One stop for all dental solutions. Led by Dr. Karthik Srinivasan. West Mambalam, Chennai." />
        <link rel="canonical" href="https://toothhaven-westmambalam.lovable.app/" />
        <meta property="og:title" content="Tooth Haven - Multispeciality Dental Care" />
        <meta property="og:description" content="One stop for all dental solutions. Advanced dental care at West Mambalam, Chennai." />
        <meta property="og:url" content="https://toothhaven-westmambalam.lovable.app/" />
      </Helmet>
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <HomeVisitSection />
        <TestimonialsSection />
        <AppointmentSection />
        <PaymentSection />
        <ContactSection />
      </main>
      <Footer />
      <HavenAIChatbot />
    </LanguageProvider>
  );
};

export default Index;
