import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Trash2, Server, MessageCircle, RefreshCw, Mail } from "lucide-react";
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

const Privacy = () => {
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
            <Shield className="w-3.5 h-3.5" />
            Privacy
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Privacy Policy
          </h1>
          <p className="text-foreground/60">{effectiveDate}</p>
        </div>

        <div className="prose prose-sm md:prose-base max-w-none">
          <Section title="1. Introduction" icon={Eye}>
            <p>
              Tooth Haven Advanced Dental Care (“we,” “us,” or “our”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, protect, and delete your personal information when you use our website, patient portal, admin portal, chatbot, and related services (collectively, the “Services”).
            </p>
            <p>
              By using the Services, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Services.
            </p>
          </Section>

          <Section title="2. Information We Collect" icon={Eye}>
            <p>We may collect the following categories of personal information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Identity information:</strong> Name, date of birth, gender, and patient ID.</li>
              <li><strong>Contact information:</strong> Phone number, email address, and residential address.</li>
              <li><strong>Health information:</strong> Dental history, symptoms, complaints, diagnoses, treatment plans, prescriptions, clinical photographs, CBCT scans, X-rays, and other investigations.</li>
              <li><strong>Account information:</strong> Login credentials, authentication tokens, and OTP verification logs.</li>
              <li><strong>Communication data:</strong> WhatsApp messages, SMS logs, appointment reminders, and chatbot conversations.</li>
              <li><strong>Payment information:</strong> Billing details, invoice records, and transaction references processed through Razorpay or UPI providers. We do not store complete card numbers or UPI PINs.</li>
              <li><strong>Technical data:</strong> IP address, browser type, device information, and usage logs collected automatically when you visit the website.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information" icon={Eye}>
            <p>We use your personal information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide dental consultations, treatments, and follow-up care.</li>
              <li>To manage appointments, reminders, and recalls.</li>
              <li>To authenticate users and secure access to the patient and admin portals.</li>
              <li>To send transactional messages, OTPs, and appointment/payment notifications via WhatsApp or SMS.</li>
              <li>To generate invoices, process payments, and maintain financial records.</li>
              <li>To operate and improve our chatbot and patient engagement features.</li>
              <li>To comply with legal, regulatory, and clinical record-keeping obligations.</li>
              <li>With explicit consent, to display anonymized or consented testimonials and success stories.</li>
            </ul>
          </Section>

          <Section title="4. How We Store and Protect Your Data" icon={Lock}>
            <p>
              Your data is stored in secure cloud databases and storage services, currently provided by Supabase. We implement technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Encrypted connections (TLS/SSL) for data in transit.</li>
              <li>Row-level security (RLS) and role-based access controls in the database.</li>
              <li>Secure authentication via OTP, email/password, and OAuth where applicable.</li>
              <li>Access logging and regular security reviews.</li>
              <li>Limited staff access based on job responsibilities.</li>
            </ul>
            <p>
              No system is completely secure. While we strive to protect your data, we cannot guarantee absolute security. Please notify us immediately if you suspect unauthorized access to your account.
            </p>
          </Section>

          <Section title="5. WhatsApp and Meta Services" icon={MessageCircle}>
            <p>
              We use WhatsApp Business Platform and related Meta services to send appointment reminders, OTPs, payment notifications, and respond to patient inquiries. When you provide your phone number and use our Services, you acknowledge that your information will be processed by Meta in accordance with the WhatsApp Business Terms and Privacy Policy.
            </p>
            <p>
              WhatsApp messages may be stored as part of your communication record to ensure continuity of care and quality assurance. You may opt out of promotional WhatsApp messages at any time.
            </p>
          </Section>

          <Section title="6. Supabase and Database Services" icon={Server}>
            <p>
              Our application backend, database, authentication, and file storage are hosted through Supabase. Personal and health data may be processed and stored by Supabase in accordance with their security and privacy standards.
            </p>
            <p>
              We configure access controls, encryption, and audit logging to limit exposure and maintain confidentiality. Supabase does not have unrestricted access to your data for routine operational purposes.
            </p>
          </Section>

          <Section title="7. Data Retention" icon={RefreshCw}>
            <p>
              We retain personal and health information for as long as necessary to provide care, comply with legal and regulatory requirements, and resolve disputes. Specific retention periods may vary based on the type of record and applicable law.
            </p>
            <p>
              When data is no longer required, we securely delete or anonymize it. Backup copies may be retained for a limited period in accordance with our disaster-recovery policies.
            </p>
          </Section>

          <Section title="8. Your Rights and Data Deletion" icon={Trash2}>
            <p>Depending on applicable law, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate or incomplete information.</li>
              <li>Request deletion of your personal data, subject to legal retention requirements.</li>
              <li>Withdraw consent for optional uses such as testimonials or promotional messages.</li>
              <li>Object to or restrict certain processing activities.</li>
              <li>Receive a copy of your data in a portable format.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the information below. We will respond within a reasonable timeframe and may need to verify your identity before processing your request.
            </p>
          </Section>

          <Section title="9. Third-Party Services and Links" icon={Server}>
            <p>
              The Services may contain links to third-party websites or integrate with third-party services such as payment gateways, messaging platforms, and analytics providers. We are not responsible for the privacy practices or content of those third parties. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </Section>

          <Section title="10. Cookies and Tracking" icon={Eye}>
            <p>
              We may use cookies and similar technologies to improve user experience, analyze traffic, and understand how visitors interact with the Services. You can manage cookie preferences through your browser settings. Essential cookies required for authentication and security cannot be disabled.
            </p>
          </Section>

          <Section title="11. Children’s Privacy" icon={Shield}>
            <p>
              The Services are intended for patients of all ages, including children under parental or guardian supervision. If we learn that we have collected personal information from a child without appropriate consent, we will take steps to delete that information.
            </p>
          </Section>

          <Section title="12. Changes to This Privacy Policy" icon={RefreshCw}>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised “Effective Date.” Your continued use of the Services after any changes indicates your acceptance of the updated policy.
            </p>
            <p>
              For material changes, we may provide additional notice through the Services or by direct communication.
            </p>
          </Section>

          <Section title="13. Contact Information" icon={Mail}>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Clinic name:</strong> Tooth Haven Advanced Dental Care</li>
              <li><strong>Address:</strong> [Clinic address — to be confirmed]</li>
              <li><strong>Email:</strong> [Privacy contact email — to be confirmed]</li>
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

export default Privacy;
