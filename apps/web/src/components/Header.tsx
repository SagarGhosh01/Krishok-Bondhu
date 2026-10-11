import React, { useState, useEffect } from "react";
import { Bell, Globe, Wifi, WifiOff, Sprout, CheckCircle2, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";
import { getCurrentUser } from "../services/api";

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState("Alex William");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user && user.full_name) {
          setUserName(user.full_name);
        }
      })
      .catch(() => {});

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
    { code: "en", label: "English", tag: "EN" },
    { code: "bn", label: "বাংলা", tag: "বাং" },
    { code: "hi", label: "हिंदी", tag: "हिं" },
  ];

  const currentLangTag = languages.find((l) => l.code === i18n.language)?.tag || "EN";

  return (
    <header className="py-3 px-4 flex items-center justify-between border-b border-agri-border/40 bg-white/70 backdrop-blur-md sticky top-0 z-40 transition-all">
      {/* User profile & greeting */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-agri-surface border-2 border-white shadow-xs flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Farmer avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          {/* Online/Offline status pill dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
            title={isOnline ? "Server Connected" : "Offline Edge Mode Active"}
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-agri-text leading-tight">{userName}</h2>
            <span className="text-[10px] font-semibold bg-agri-bg border border-agri-border text-agri-primary px-1.5 py-0.2 rounded-md">
              Field Pro
            </span>
          </div>
          <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {isOnline ? "Cloud & Edge Sync" : "On-Device Edge Mode"}
          </p>
        </div>
      </div>

      {/* Right controls: Lang Switcher, Notification bell */}
      <div className="flex items-center gap-2">
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="h-9 px-3 rounded-2xl bg-white border border-agri-border flex items-center gap-1.5 text-xs font-semibold text-agri-text hover:bg-agri-surface shadow-xs transition active:scale-95"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-agri-primary" />
            <span>{currentLangTag}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-3xl shadow-xl border border-agri-border py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-100">
                Language
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-agri-surface flex items-center justify-between transition ${
                    i18n.language === lang.code
                      ? "text-agri-primary font-bold bg-agri-bg/60"
                      : "text-agri-text"
                  }`}
                >
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-agri-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-2xl bg-white border border-agri-border flex items-center justify-center text-agri-text hover:bg-agri-surface shadow-xs transition relative active:scale-95"
          >
            <Bell className="w-4 h-4 text-stone-700" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-agri-primary animate-ping"></span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-agri-primary"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-xl border border-agri-border p-3 z-50 animate-in fade-in zoom-in-95 space-y-2">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2 px-1">
                <span className="text-xs font-bold text-agri-text">Field Alerts</span>
                <span className="text-[10px] text-agri-primary font-medium">1 New</span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-100 text-xs">
                <span className="font-bold text-emerald-900 block text-[11px]">
                  Optimal Spray Window
                </span>
                <p className="text-emerald-800 text-[11px] leading-relaxed mt-0.5">
                  Dry foliage conditions today. Low spore germination risk across your tomato plot.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
