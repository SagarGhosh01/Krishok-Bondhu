import React, { useState, useEffect } from "react";
import { Bell, Globe, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";
import { getCurrentUser } from "../services/api";

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState("Alex William");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user && user.full_name) {
        setUserName(user.full_name);
      }
    }).catch(() => {});

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const languages = [
    { code: "en", label: "English" },
    { code: "bn", label: "বাংলা" },
    { code: "hi", label: "हिंदी" },
  ];

  return (
    <header className="flex items-center justify-between py-3 px-4">
      {/* User profile greeting */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-agri-primary/20 border-2 border-white shadow-sm flex items-center justify-center">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt="User avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-agri-text leading-tight">{userName}</h2>
          <p className="text-xs text-agri-muted flex items-center gap-1">
            {t("home.welcome")}
          </p>
        </div>
      </div>

      {/* Right controls: Offline badge, Lang Switcher, Notification bell */}
      <div className="flex items-center gap-2">
        {!isOnline && (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-300">
            <WifiOff className="w-3 h-3" /> Offline
          </span>
        )}

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="w-9 h-9 rounded-full bg-white border border-agri-border flex items-center justify-center text-agri-text hover:bg-agri-surface shadow-xs transition"
            title="Switch Language"
          >
            <Globe className="w-4 h-4 text-agri-primary" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border border-agri-border py-1 z-50 animate-in fade-in zoom-in-95">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-agri-surface flex items-center justify-between ${
                    i18n.language === lang.code ? "text-agri-primary font-bold" : "text-agri-text"
                  }`}
                >
                  {lang.label}
                  {i18n.language === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-agri-primary"></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <button className="w-9 h-9 rounded-full bg-white border border-agri-border flex items-center justify-center text-agri-text hover:bg-agri-surface shadow-xs transition relative">
          <Bell className="w-4 h-4 text-agri-text" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-agri-primary"></span>
        </button>
      </div>
    </header>
  );
};
