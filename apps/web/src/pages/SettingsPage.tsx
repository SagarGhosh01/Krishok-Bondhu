import React, { useState } from "react";
import {
  Settings,
  Globe,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle2,
  Eye,
  Database,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { db } from "../db/indexedDb";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [currentLang, setCurrentLang] = useState(i18n.language || "en");
  const [highContrast, setHighContrast] = useState(false);
  const [clearedMessage, setClearedMessage] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setCurrentLang(lang);
    changeLanguage(lang);
  };

  const handleExportData = async () => {
    try {
      const scans = await db.scans.toArray();
      const profileStr = localStorage.getItem("agrishield_farmer_profile");
      const profile = profileStr ? JSON.parse(profileStr) : null;

      const exportObj = {
        exported_at: new Date().toISOString(),
        farmer_profile: profile,
        offline_scans: scans,
        platform: "AgriShield AI v1.0.0",
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agrishield-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleClearData = async () => {
    if (window.confirm("Are you sure you want to delete all locally cached scans, profile settings, and login credentials? This cannot be undone.")) {
      await db.scans.clear();
      await db.pendingSync.clear();
      localStorage.removeItem("agrishield_token");
      localStorage.removeItem("agrishield_farmer_profile");
      setClearedMessage(true);
      setTimeout(() => setClearedMessage(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-stone-100 text-stone-800 border border-stone-200 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-900">Settings & Privacy</h1>
            <p className="text-xs text-stone-500">
              Manage application language, offline cache storage, and data sovereignty.
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-agri-primary" />
            <span>Application Language</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { code: "en", name: "English", sub: "Standard English" },
              { code: "bn", name: "বাংলা", sub: "Bengali (পশ্চিমবঙ্গ)" },
              { code: "hi", name: "हिंदी", sub: "Hindi (भारत)" },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                  currentLang === lang.code
                    ? "border-agri-primary bg-emerald-50/70 text-emerald-950 font-bold shadow-xs"
                    : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <div>
                  <span className="text-sm block">{lang.name}</span>
                  <span className="text-[10px] text-stone-500 block">{lang.sub}</span>
                </div>
                {currentLang === lang.code && <CheckCircle2 className="w-4 h-4 text-agri-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility & Display */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Accessibility & Visuals</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <div>
                <span className="font-bold text-stone-800 block">High Contrast Mode</span>
                <span className="text-[10px] text-stone-500">Increases border and text distinction for outdoor field sunlight</span>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-4 h-4 accent-agri-primary"
              />
            </div>
          </div>
        </div>

        {/* Privacy & Data Governance */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600" />
            <span>Local Data Sovereignty & Offline Cache</span>
          </h2>

          <p className="text-xs text-stone-500 leading-relaxed mb-4">
            AgriShield AI stores offline scans and cached agronomy advisories inside your browser's private IndexedDB storage. Your private farm records are never sold or shared with commercial entities.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleExportData}
              className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-stone-600" />
              <span>Export All Farm Data (JSON)</span>
            </button>

            <button
              onClick={handleClearData}
              className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Purge Local Data & Cache</span>
            </button>
          </div>

          {clearedMessage && (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              All local storage, scans, and cached profiles were successfully cleared.
            </div>
          )}
        </div>

        {/* Official Non-Replacement Disclaimers */}
        <div className="p-4 rounded-3xl bg-stone-100 text-[11px] text-stone-500 leading-relaxed space-y-1">
          <p>
            <strong>Platform Compliance:</strong> AgriShield AI adheres to the Digital Personal Data Protection (DPDP) Act guidelines. No Aadhaar numbers or financial passwords are ever requested or stored.
          </p>
          <p>Version 1.0.0 &bull; Built with FastAPI, PyTorch, ONNX Runtime Web, and React 19.</p>
        </div>
      </main>

      <Navigation />
    </div>
  );
};
