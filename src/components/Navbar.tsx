import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, UserCircle, LogIn, Shield, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "@/components/Logo";


const Navbar = () => {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const hrefFor = (anchor: string) => (isHome ? anchor : `/${anchor}`);
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { key: "nav.home", href: "#home" },
    { key: "nav.services", href: "#services" },
    { key: "nav.about", href: "#about" },
    { key: "nav.homeVisit", href: "#home-visit" },
    { key: "nav.testimonials", href: "#testimonials" },
    { key: "nav.contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-2">
          <Logo tone="teal" size="sm" />
        </Link>


        <div className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={hrefFor(item.href)}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {t(item.key)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {lang === "en" ? "தமிழ்" : "English"}
          </button>


          <DropdownMenu>
            <DropdownMenuTrigger className="hidden md:inline-flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">
              <LogIn className="w-4 h-4" />
              Login
              <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-50">
              <DropdownMenuLabel>Sign in as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/patient-portal" className="cursor-pointer">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Patient Portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin / Staff
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <a
            href={hrefFor("#appointment")}
            className="hidden md:inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Phone className="w-4 h-4" />
            {t("nav.bookAppointment")}
          </a>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-foreground"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-background border-b border-border px-4 pb-4">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={hrefFor(item.href)}
              onClick={() => setIsOpen(false)}
              className="block py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {t(item.key)}
            </a>
          ))}
          <Link
            to="/patient-portal"
            onClick={() => setIsOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <UserCircle className="w-4 h-4" />
            Patient Login
          </Link>
          <Link
            to="/admin"
            onClick={() => setIsOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Shield className="w-4 h-4" />
            Admin Login
          </Link>
          <a
            href={hrefFor("#appointment")}
            onClick={() => setIsOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Phone className="w-4 h-4" />
            {t("nav.bookAppointment")}
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
