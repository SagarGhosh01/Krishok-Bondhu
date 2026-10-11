import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  ArrowRight,
  Clock,
  WifiOff,
  CheckCircle2,
  Radio,
  Bot,
  BookOpen,
  CloudSun,
  Thermometer,
  Droplets,
  ShieldAlert,
  ChevronRight,
  Sprout,
} from "lucide-react";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { KrishiMitraModal } from "../components/KrishiMitraModal";
import { db, StoredScan } from "../db/indexedDb";
import { fetchUserScans } from "../services/api";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recentScans, setRecentScans] = useState<StoredScan[]>([]);
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>("All");
  const [showKrishiMitra, setShowKrishiMitra] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScans() {
      try {
        const localScans = await db.scans.orderBy("createdAt").reverse().limit(10).toArray();

        if (navigator.onLine) {
          try {
            const apiRes = await fetchUserScans(1, 10);
            if (apiRes.items && apiRes.items.length > 0) {
              const formatted: StoredScan[] = apiRes.items.map((item: any) => ({
                id: item.id,
                imageData: item.image_url,
                originalFilename: item.original_filename,
                crop: item.prediction?.primary_crop || "Crop",
                disease: item.prediction?.primary_disease || "Diagnosed Leaf",
                confidence: item.prediction?.calibrated_confidence || 0.8,
                reliability: item.prediction?.reliability_score || 0.85,
                diagnosticState: item.prediction?.state || "CONFIDENT",
                isOfflinePending: item.is_offline_captured,
                createdAt: item.created_at,
                gradcamUrl: item.prediction?.gradcam_url,
              }));
              setRecentScans(formatted);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Backend scans fetch fallback to local DB:", e);
          }
        }

        setRecentScans(localScans);
      } catch (err) {
        console.error("Error loading scans:", err);
      } finally {
        setLoading(false);
      }
    }

    loadScans();
  }, []);

  const getRelativeTime = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return "just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return "recently";
    }
  };

  const filteredScans =
    selectedCropFilter === "All"
      ? recentScans
      : recentScans.filter((s) => s.crop?.toLowerCase().includes(selectedCropFilter.toLowerCase()));

  return (
    <div className="min-h-screen bg-agri-bg pb-28 max-w-md mx-auto relative font-sans flex flex-col">
      <Header />

      <main className="px-4 py-3 space-y-4 flex-1">
        {/* Micro-Climate & Field Weather Ticker */}
        <div className="bg-gradient-to-r from-[#212922] to-[#2B362D] text-white p-4 rounded-3xl shadow-sm border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-agri-accent">
              <CloudSun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">24.5°C</span>
                <span className="text-xs text-stone-300">| 84% RH</span>
              </div>
              <p className="text-[11px] text-stone-300">
                Weather: Clear Foliage • Spray Window Favorable
              </p>
            </div>
          </div>
          <Link
            to="/outbreak"
            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border border-white/10 transition"
          >
            Radar Risk →
          </Link>
        </div>

        {/* 4 Professional Quick-Action Feature Shortcuts */}
        <div className="grid grid-cols-4 gap-2">
          <Link
            to="/recognize"
            className="bg-white p-3 rounded-2xl border border-agri-border shadow-xs flex flex-col items-center text-center hover:bg-agri-surface transition active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-agri-primary text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-agri-text leading-tight">Scan Leaf</span>
          </Link>

          <Link
            to="/outbreak"
            className="bg-white p-3 rounded-2xl border border-agri-border shadow-xs flex flex-col items-center text-center hover:bg-agri-surface transition active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[11px] font-bold text-agri-text leading-tight">Radar</span>
          </Link>

          <button
            onClick={() => setShowKrishiMitra(true)}
            className="bg-white p-3 rounded-2xl border border-agri-border shadow-xs flex flex-col items-center text-center hover:bg-agri-surface transition active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-agri-text leading-tight">Advisor</span>
          </button>

          <Link
            to="/library"
            className="bg-white p-3 rounded-2xl border border-agri-border shadow-xs flex flex-col items-center text-center hover:bg-agri-surface transition active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-700 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-agri-text leading-tight">Library</span>
          </Link>
        </div>

        {/* Primary Hero Scan Card */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-agri-primary">
                Instant Disease Screening
              </span>
              <h3 className="text-base font-bold text-agri-text leading-tight mt-0.5">
                {t("home.scan_card_title", "Know plant disease with AgriShield AI")}
              </h3>
              <p className="text-xs text-agri-muted mt-1 leading-relaxed">
                {t("home.scan_card_desc", "Get instant calibrated diagnosis and verified prevention guidance.")}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-agri-surface border border-agri-border flex items-center justify-center shrink-0 text-agri-primary">
              <Sprout className="w-7 h-7" />
            </div>
          </div>

          <Link
            to="/recognize"
            className="w-full py-3.5 px-4 rounded-2xl bg-agri-primary hover:bg-agri-primaryHover text-white font-bold text-xs tracking-wide text-center transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>{t("home.scan_now", "Scan Foliage Now")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Recent Diagnoses List with Crop Filter Tabs */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-agri-text">
                {t("home.recent_diagnoses", "Recent Diagnoses")}
              </h4>
              <p className="text-[10px] text-stone-400">
                {filteredScans.length} screening records
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1">
              {["All", "Tomato", "Potato", "Corn"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCropFilter(c)}
                  className={`text-[10px] px-2.5 py-1 rounded-xl font-semibold transition ${
                    selectedCropFilter === c
                      ? "bg-agri-primary text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {filteredScans.length === 0 ? (
              <div className="py-8 text-center text-xs text-agri-muted space-y-2">
                <Clock className="w-8 h-8 mx-auto text-stone-300" />
                <p>{t("home.no_scans", "No scans recorded yet. Tap 'Scan Leaf' to screen your crops.")}</p>
                <Link
                  to="/recognize"
                  className="inline-block mt-1 text-xs font-bold text-agri-primary hover:underline"
                >
                  Start First Scan →
                </Link>
              </div>
            ) : (
              filteredScans.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => navigate(`/result?scan_id=${scan.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-agri-surface/50 rounded-2xl px-2 cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden border border-agri-border shrink-0 flex items-center justify-center">
                      <img
                        src={scan.imageData}
                        alt="Thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-agri-text leading-snug">
                        {scan.disease?.replace(/___/g, " - ").replace(/_/g, " ")}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-agri-primary bg-agri-bg px-1.5 py-0.2 rounded-md">
                          {scan.crop}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {getRelativeTime(scan.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-extrabold text-agri-text">
                        {Math.round((scan.confidence || 0.8) * 100)}%
                      </span>
                      {scan.isOfflinePending ? (
                        <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full font-semibold">
                          Pending
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-semibold">
                          Synced
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-agri-primary transition" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Navigation />

      {/* Krishi Mitra AI Assistant Modal */}
      <KrishiMitraModal
        isOpen={showKrishiMitra}
        onClose={() => setShowKrishiMitra(false)}
      />
    </div>
  );
};
