import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  TrendingUp,
  Store,
  CloudRain,
  Landmark,
  FlaskConical,
  Settings,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/yield", label: "Yield", icon: TrendingUp },
    { path: "/mandi", label: "Mandi", icon: Store },
    { path: "/recognize", label: "Scan Leaf", icon: ScanLine, isPrimary: true },
    { path: "/weather", label: "Weather", icon: CloudRain },
    { path: "/schemes", label: "Schemes", icon: Landmark },
    { path: "/soil", label: "Soil", icon: FlaskConical },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-2 sm:px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#1C241E]/95 text-white/80 px-2 sm:px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1 sm:gap-1.5 border border-white/10 backdrop-blur-lg max-w-full overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="bg-agri-primary text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:bg-agri-primaryHover transition-all transform hover:scale-105 active:scale-95 shrink-0 mx-0.5"
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
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-agri-primary text-white shadow-md"
                  : "hover:text-white hover:bg-white/10 text-stone-300"
              }`}
              title={item.label}
            >
              <Icon className="w-4 h-4" />
              {isActive && <span className="hidden md:inline">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
