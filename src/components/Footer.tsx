import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/tooth-haven-logo.png";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-foreground py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Tooth Haven" className="h-10" />
          </div>
          <p className="text-background/60 text-sm text-center">
            © {new Date().getFullYear()} Tooth Haven Multispeciality Dental Care. {t("footer.rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
