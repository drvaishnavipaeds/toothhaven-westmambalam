import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import Logo from "@/components/Logo";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-foreground py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo tone="white" size="md" showTagline />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <Link
              to="/terms"
              className="text-sm text-background/70 hover:text-background transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-background/70 hover:text-background transition-colors"
            >
              Privacy Policy
            </Link>
            <p className="text-background/60 text-sm text-center">
              © {new Date().getFullYear()} Tooth Haven Multispeciality Dental Care. {t("footer.rights")}.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
