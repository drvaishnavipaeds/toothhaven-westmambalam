import { Link } from "react-router-dom";
import { ArrowLeft, Scale, FileText, Shield, MessageCircle, Database } from "lucide-react";
import Logo from "@/components/Logo";

const Section = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) => (
  <section className="mb-10">
    <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-primary" />}
      {title}
    </h2>
    <div className="space-y-3 text-foreground/80 leading-relaxed">{children}</div>
  </section>
);

const Terms = () => {
  const effectiveDate = "[Effective Date — to be confirmed]";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo tone="teal" size="sm" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-16 max-w-4xl">
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Scale className="w-3.5 h-3.5" />
            Legal
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Terms of Service
          </h1>
          <p className="text-foreground/60">{effectiveDate}</p>
        </div>

        <div className="prose prose-sm md:prose-base max-w-none">
          <Section title="1. Acceptance of Terms" icon={FileText}>
            <p>
              Welcome to Tooth Haven Advanced Dental Care (“we,” “us,” or “our”). These Terms of Service (“Terms”) govern your access to and use of our website, patient portal, admin portal, chatbot, and related services (collectively, the “Services”).
            </p>
            <p>
              By accessing or using the Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Services. These Terms apply to all visitors, patients, staff, and other users.
            </p>
          </Section>

          <Section title="2. Use of the Website and Application" icon={Shield}>
            <p>
              You may use the Services only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Services in any way that violates applicable laws or regulations.</li>
              <li>Attempt to gain unauthorized access to any portion of the Services or related systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Services.</li>
              <li>Use automated means, such as bots or scrapers, to access the Services without our written consent.</li>
              <li>Upload or transmit viruses, malware, or other harmful code.</li>
            </ul>
          </Section>

          <Section title="3. User Accounts and Authentication" icon={Shield}>
            <p>
              Certain features require you to create an account or verify your identity. When you register, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <p>
              Patient access may be secured through phone-number-based OTP (one-time password) sent via WhatsApp or SMS. Staff access may be secured through email/password login or OTP, depending on configuration. You must not share OTPs, passwords, or session tokens with anyone.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or that present a security risk.
            </p>
          </Section>

          <Section title="4. WhatsApp / OTP Communication" icon={MessageCircle}>
            <p>
              By providing your phone number and using the Services, you consent to receive transactional messages, appointment confirmations, reminders, payment notifications, and OTP codes through WhatsApp or SMS where applicable. Message and data rates may apply based on your carrier.
            </p>
            <p>
              Promotional messages are sent only with appropriate consent and in compliance with applicable regulations. You may opt out of promotional messaging at any time by following the instructions in the message or contacting us.
            </p>
          </Section>

          <Section title="5. User Responsibilities" icon={Shield}>
            <p>
              You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Providing accurate health and contact information.</li>
              <li>Keeping your login credentials secure.</li>
              <li>Reviewing treatment plans, prescriptions, and invoices before accepting them.</li>
              <li>Following clinical advice and attending scheduled appointments.</li>
            </ul>
            <p>
              The Services are not a substitute for emergency medical care. If you are experiencing a dental emergency, please contact the clinic directly or visit the nearest emergency facility.
            </p>
          </Section>

          <Section title="6. Intellectual Property" icon={FileText}>
            <p>
              All content, designs, logos, text, graphics, images, software, and other materials on the Services are owned by or licensed to us and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit any of our materials without our prior written consent.
            </p>
            <p>
              Patient-generated content, such as testimonials submitted with explicit consent, remains the property of the patient but is licensed to us for display on our website and promotional materials.
            </p>
          </Section>

          <Section title="7. Third-Party Services" icon={Database}>
            <p>
              The Services may integrate with third-party providers, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Meta / WhatsApp</strong> — for messaging, OTP, and appointment notifications.</li>
              <li><strong>Supabase</strong> — for database, authentication, and backend services.</li>
              <li><strong>Razorpay / UPI providers</strong> — for payment processing.</li>
              <li><strong>Google / OAuth providers</strong> — for authentication where configured.</li>
            </ul>
            <p>
              Your use of third-party services is subject to their respective terms and privacy policies. We are not responsible for the acts, omissions, or policies of third-party providers.
            </p>
          </Section>

          <Section title="8. Limitation of Liability" icon={Shield}>
            <p>
              To the fullest extent permitted by law, Tooth Haven Advanced Dental Care and its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Services.
            </p>
            <p>
              Our total liability for any claim arising from these Terms or the Services shall not exceed the amount paid by you, if any, for the specific service giving rise to the claim during the twelve (12) months preceding the claim.
            </p>
            <p>
              Nothing in these Terms limits liability that cannot be excluded under applicable law, including liability for fraud, gross negligence, or willful misconduct.
            </p>
          </Section>

          <Section title="9. Termination" icon={FileText}>
            <p>
              We may suspend or terminate your access to the Services at any time, with or without notice, for conduct that we believe violates these Terms, poses a security risk, or is harmful to others.
            </p>
            <p>
              Upon termination, your right to use the Services ceases immediately. Provisions that by their nature should survive termination shall survive, including intellectual property, limitation of liability, and governing law.
            </p>
          </Section>

          <Section title="10. Governing Law and Disputes" icon={Scale}>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles. Any dispute arising from these Terms or the Services shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.
            </p>
            <p>
              Before initiating formal legal proceedings, we encourage you to contact us so we can attempt to resolve the matter informally.
            </p>
          </Section>

          <Section title="11. Changes to These Terms" icon={FileText}>
            <p>
              We may update these Terms from time to time. The updated version will be indicated by a revised “Effective Date” at the top of the page. Your continued use of the Services after the changes constitutes acceptance of the revised Terms.
            </p>
            <p>
              We encourage you to review these Terms periodically. Material changes may also be communicated through the Services or by email where appropriate.
            </p>
          </Section>

          <Section title="12. Contact Information" icon={MessageCircle}>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Clinic name:</strong> Tooth Haven Advanced Dental Care</li>
              <li><strong>Address:</strong> [Clinic address — to be confirmed]</li>
              <li><strong>Email:</strong> [Contact email — to be confirmed]</li>
              <li><strong>Phone:</strong> [Contact phone — to be confirmed]</li>
            </ul>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-foreground/60">
          © {new Date().getFullYear()} Tooth Haven Advanced Dental Care. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Terms;
