import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Clock, WifiOff, CheckCircle2 } from "lucide-react";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { db, StoredScan } from "../db/indexedDb";
import { fetchUserScans } from "../services/api";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recentScans, setRecentScans] = useState<StoredScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScans() {
      try {
        // First check IndexedDB for offline and recent scans
        const localScans = await db.scans.orderBy("createdAt").reverse().limit(10).toArray();

        // If online, also fetch from backend API
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
            console.warn("Backend scans fetch failed, falling back to local DB:", e);
          }
        }

        setRecentScans(localScans);
      } catch (err) {
        console.error("Error loading recent scans:", err);
      } finally {
        setLoading(false);
      }
    }

    loadScans();
  }, []);

  // Format relative timestamp
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

  return (
    <div className="min-h-screen bg-agri-bg pb-28 max-w-md mx-auto relative font-sans flex flex-col">
      <Header />

      <main className="px-4 space-y-4 flex-1">
        {/* Hero Banner: Static editorial content as mandated by Rule 1 */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm h-48 bg-stone-900 border border-agri-border/40">
          <img
            src="https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=800&auto=format&fit=crop&q=80"
            alt="Farmer inspecting crop field"
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-5 text-white">
            <h3 className="text-base font-bold leading-tight drop-shadow-sm">
              {t("home.hero_title")}
            </h3>
            <p className="text-xs text-stone-200 mt-1 line-clamp-2 leading-relaxed">
              {t("home.hero_desc")}
            </p>
          </div>
        </div>

        {/* Scan Now Card */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-agri-surface border border-agri-border flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-agri-primary" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-agri-text">
                {t("home.scan_card_title")}
              </h4>
              <p className="text-xs text-agri-muted mt-0.5">
                {t("home.scan_card_desc")}
              </p>
            </div>
          </div>

          <Link
            to="/recognize"
            className="w-full py-3 px-4 rounded-2xl border-2 border-agri-primary text-agri-primary font-semibold text-xs tracking-wide text-center hover:bg-agri-primary hover:text-white transition-all duration-200 active:scale-[0.98] shadow-xs flex items-center justify-center gap-2"
          >
            <span>{t("home.scan_now")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent Diagnoses List */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-agri-text">
              {t("home.recent_diagnoses")}
            </h4>
            <span className="text-[11px] font-medium text-agri-muted">
              {recentScans.length} scans
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {recentScans.length === 0 ? (
              <div className="py-6 text-center text-xs text-agri-muted space-y-2">
                <Clock className="w-7 h-7 mx-auto text-agri-muted/50" />
                <p>{t("home.no_scans")}</p>
              </div>
            ) : (
              recentScans.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => navigate(`/result?scan_id=${scan.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-agri-surface/50 rounded-xl px-1 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden border border-agri-border shrink-0 flex items-center justify-center">
                      <img
                        src={scan.imageData}
                        alt="Diagnosis thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-agri-text leading-snug">
                        {scan.disease?.replace(/___/g, " - ").replace(/_/g, " ")}
                      </h5>
                      <span className="text-[11px] text-agri-muted font-medium">
                        {scan.crop}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-agri-muted">
                      {getRelativeTime(scan.createdAt)}
                    </span>
                    {scan.isOfflinePending ? (
                      <span className="flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                        <WifiOff className="w-2.5 h-2.5" /> Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Synced
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
};
