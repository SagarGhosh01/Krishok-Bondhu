import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, ScanLine, Sprout, User, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/outbreak", label: "Radar", icon: Radio },
    { path: "/recognize", label: t("nav.scan"), icon: ScanLine, isPrimary: true },
    { path: "/library", label: t("nav.library"), icon: BookOpen },
    { path: "/farms", label: t("nav.farms"), icon: Sprout },
    { path: "/profile", label: t("nav.profile"), icon: User },
  ];

  return (
    <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#232B25] text-white/70 px-3 py-2 rounded-full shadow-2xl flex items-center gap-1 sm:gap-2 border border-white/10 backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="bg-agri-primary text-white p-3 rounded-full shadow-lg hover:bg-agri-primaryHover transition-all transform hover:scale-105 active:scale-95 mx-1"
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-agri-primary text-white shadow-md font-semibold"
                  : "hover:text-white hover:bg-white/5 text-stone-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {isActive && <span className="hidden xs:inline">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
