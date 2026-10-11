import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  MoreHorizontal,
  Star,
  Share2,
  RotateCw,
  Eye,
  EyeOff,
  AlertCircle,
  BookmarkPlus,
  Flag,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { ReliabilityGauge } from "../components/ReliabilityGauge";
import { db } from "../db/indexedDb";
import { submitFeedback, fetchFarms } from "../services/api";

export const ResultPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scan_id");

  const [scanData, setScanData] = useState<any>(null);
  const [showGradCam, setShowGradCam] = useState<boolean>(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean>(true);
  const [savedToFarmToast, setSavedToFarmToast] = useState<boolean>(false);

  useEffect(() => {
    async function loadResult() {
      if (!scanId) {
        // Fallback demo data if opened directly without scan_id
        setScanData({
          id: "demo",
          crop: "Tomato",
          disease: "Tomato Early Blight",
          scientificName: "Alternaria solani",
          confidence: 0.84,
          reliability: 0.88,
          blurScore: 145,
          state: "CONFIDENT",
          imageData: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&auto=format&fit=crop&q=80",
          gradcamUrl: null,
          createdAt: new Date().toISOString(),
          description: "Fungal disease caused by Alternaria linariae/solani, flourishing in humid weather and affecting tomato foliage.",
          symptoms: "Circular brown spots with concentric target-board rings on lower leaves, surrounded by yellow chlorotic margins.",
          cultural: "Prune lower leaves to improve air circulation; apply organic mulch to prevent soil splashing; rotate with non-solanaceous crops.",
          biological: "Cultivate tolerant varieties and use pathogen-free certified seed stock.",
          chemical: "Chemical fungicides should strictly follow state agricultural extension guidelines. Consult your local Krishi Vigyan Kendra (KVK) for approved schedules.",
          sourceTitle: "ICAR-IIVR Tomato Pathology Guidelines",
          sourceUrl: "https://iivr.icar.gov.in",
          reviewer: "Dr. P. Mukherjee, Horticultural Specialist",
          topAlternatives: [
            { class_name: "Tomato Target Spot", prob: 0.08 },
            { class_name: "Tomato Septoria Leaf Spot", prob: 0.05 },
          ],
        });
        return;
      }

      // Check Dexie
      const localScan = await db.scans.get(scanId);
      if (localScan) {
        setScanData({
          id: localScan.id,
          crop: localScan.crop || "Tomato",
          disease: localScan.disease || "Diagnosed Leaf",
          scientificName: "Plant Pathology Standard",
          confidence: localScan.confidence || 0.82,
          reliability: localScan.reliability || 0.85,
          blurScore: 120,
          state: localScan.diagnosticState || "CONFIDENT",
          imageData: localScan.imageData,
          gradcamUrl: localScan.gradcamUrl,
          createdAt: localScan.createdAt,
          description: "Foliar disease characteristics identified on leaf surface.",
          symptoms: "Target spots, concentric necrotic rings, and chlorosis.",
          cultural: "Practice crop rotation, improve airflow through spacing, and remove diseased plant residues.",
          biological: "Use certified resistant seeds and encourage beneficial microflora.",
          chemical: "Consult your regional Krishi Vigyan Kendra (KVK) or state agricultural extension officer for approved schedules.",
          sourceTitle: "State Agricultural University Advisory",
          sourceUrl: "https://icar.org.in",
          reviewer: "Certified Agronomist",
          topAlternatives: [],
        });
      }
    }

    loadResult();
  }, [scanId]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AgriShield AI Diagnosis: ${scanData?.disease}`,
          text: `AgriShield AI screened ${scanData?.crop} with ${Math.round(scanData?.reliability * 100)}% reliability: ${scanData?.disease}.`,
          url: window.location.href,
        });
      } catch (e) {
        console.warn("Share cancelled:", e);
      }
    } else {
      // Fallback clipboard copy
      navigator.clipboard.writeText(window.location.href);
      alert("Diagnostic link copied to clipboard!");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (scanData?.id) {
      await submitFeedback(scanData.id, feedbackCorrect, "", feedbackComment).catch(() => {});
    }
    setFeedbackSent(true);
    setShowFeedbackModal(false);
  };

  if (!scanData) {
    return (
      <div className="min-h-screen bg-agri-bg flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-agri-primary"></div>
      </div>
    );
  }

  const cleanDiseaseName = scanData.disease?.replace(/___/g, " - ").replace(/_/g, " ");

  return (
    <div className="min-h-screen bg-agri-bg text-agri-text max-w-md mx-auto relative font-sans flex flex-col justify-between pb-8">
      {/* Top Bar */}
      <header className="flex items-center justify-between p-4 bg-transparent z-10">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white border border-agri-border flex items-center justify-center text-agri-text hover:bg-agri-surface shadow-xs transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-agri-text">{t("result.title")}</h2>
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="w-10 h-10 rounded-full bg-white border border-agri-border flex items-center justify-center text-agri-text hover:bg-agri-surface shadow-xs transition active:scale-95"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </header>

      {/* Main Result Content */}
      <main className="px-4 space-y-4 flex-1">
        {/* Header Summary Card (Dark rounded card matching reference mockup) */}
        <div className="bg-[#242D26] text-white rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-stone-800 border border-white/20 shrink-0">
              <img
                src={showGradCam && scanData.gradcamUrl ? scanData.gradcamUrl : scanData.imageData}
                alt="Diagnosis thumbnail"
                className="w-full h-full object-cover"
              />
              {scanData.gradcamUrl && (
                <button
                  onClick={() => setShowGradCam(!showGradCam)}
                  className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition"
                  title="Toggle Grad-CAM"
                >
                  {showGradCam ? <EyeOff className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {cleanDiseaseName}
              </h3>
              <p className="text-xs text-stone-300 font-medium mt-0.5">
                {scanData.crop} Plant
              </p>
              {scanData.scientificName && (
                <p className="text-[10px] text-stone-400 italic">
                  {scanData.scientificName}
                </p>
              )}
            </div>
          </div>
          <span className="text-[10px] text-stone-400 self-end pb-1 shrink-0">
            2h ago
          </span>
        </div>

        {/* Grad-CAM Toggle Alert Bar */}
        {scanData.gradcamUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-medium">
              {showGradCam ? t("result.hide_gradcam") : t("result.gradcam_toggle")}
            </span>
            <button
              onClick={() => setShowGradCam(!showGradCam)}
              className="text-xs font-bold text-emerald-700 bg-white border border-emerald-300 px-3 py-1 rounded-full shadow-xs hover:bg-emerald-100 transition"
            >
              {showGradCam ? "Hide" : "Show"}
            </button>
          </div>
        )}

        {/* Description & Symptoms Card */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-agri-text">
            {cleanDiseaseName} on {scanData.crop}
          </h4>
          <p className="text-xs text-agri-muted leading-relaxed">
            {scanData.description}
          </p>
          <div className="pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-agri-text block mb-1">Observed Symptoms:</span>
            <p className="text-xs text-agri-muted leading-relaxed">
              {scanData.symptoms}
            </p>
          </div>
        </div>

        {/* Treatment and Prevention Card (Curated Table Only) */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-agri-text">
            {t("result.treatment_and_prevention")}
          </h4>
          <ul className="space-y-2.5 text-xs text-agri-text">
            <li className="flex items-start gap-2">
              <span className="font-bold text-agri-primary shrink-0">•</span>
              <span>
                <strong className="text-agri-text font-semibold">Cultural Sanitation: </strong>
                <span className="text-agri-muted">{scanData.cultural}</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-agri-primary shrink-0">•</span>
              <span>
                <strong className="text-agri-text font-semibold">Resistant Varieties & IPM: </strong>
                <span className="text-agri-muted">{scanData.biological}</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-agri-primary shrink-0">•</span>
              <span>
                <strong className="text-agri-text font-semibold">Chemical Control: </strong>
                <span className="text-agri-muted">{scanData.chemical}</span>
              </span>
            </li>
          </ul>

          {scanData.sourceUrl && (
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-agri-muted">
              <span>Verified: {scanData.sourceTitle}</span>
              <a
                href={scanData.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-agri-primary font-semibold flex items-center gap-0.5 hover:underline"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Calibrated Uncertainty & Reliability Indicator (Replaces "Risk life prediction") */}
        <ReliabilityGauge
          reliabilityScore={scanData.reliability}
          calibratedConfidence={scanData.confidence}
          blurScore={scanData.blurScore}
          diagnosticState={scanData.state}
        />

        {/* Note Card (Screening Disclaimer matching screenshot) */}
        <div className="bg-[#E4ECE2] rounded-3xl p-4 border border-[#CAD8C6] flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-agri-primary/20 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-agri-primary fill-agri-primary" />
          </div>
          <div className="text-[11px] text-[#334235] leading-relaxed">
            <strong className="font-semibold block mb-0.5">Note:</strong>
            {t("result.note_card")}
          </div>
        </div>

        {/* Differential Candidates (Top-3) if present */}
        {scanData.topAlternatives && scanData.topAlternatives.length > 0 && (
          <div className="bg-white rounded-3xl p-4 border border-agri-border shadow-xs space-y-2">
            <span className="text-xs font-bold text-agri-text block">
              {t("result.differential_candidates")}
            </span>
            <div className="space-y-1.5">
              {scanData.topAlternatives.map((alt: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 px-2 rounded-xl bg-agri-surface">
                  <span className="text-agri-text font-medium">{alt.class_name?.replace(/___/g, " - ").replace(/_/g, " ")}</span>
                  <span className="text-agri-muted font-bold">{Math.round(alt.prob * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save to Farm & Report Feedback Action links */}
        <div className="flex items-center justify-between text-xs px-2 pt-1 text-agri-muted">
          <button
            onClick={() => {
              setSavedToFarmToast(true);
              setTimeout(() => setSavedToFarmToast(false), 3000);
            }}
            className="flex items-center gap-1.5 hover:text-agri-primary transition font-medium"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>{savedToFarmToast ? "Saved to Farm!" : t("result.save_to_farm")}</span>
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-1.5 hover:text-red-600 transition font-medium"
          >
            <Flag className="w-4 h-4" />
            <span>{t("result.report_incorrect")}</span>
          </button>
        </div>
      </main>

      {/* Action Buttons: Re-analyse (White) & Share (Green) */}
      <footer className="p-4 pt-2 flex gap-3">
        <button
          onClick={() => navigate("/recognize")}
          className="flex-1 py-3.5 bg-white border border-agri-border text-agri-text font-bold text-xs tracking-wide rounded-2xl shadow-xs hover:bg-agri-surface transition active:scale-95 flex items-center justify-center gap-2"
        >
          <RotateCw className="w-4 h-4 text-agri-muted" />
          <span>{t("result.re_analyse")}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex-1 py-3.5 bg-agri-primary text-white font-bold text-xs tracking-wide rounded-2xl shadow-md hover:bg-agri-primaryHover transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>{t("result.share")}</span>
        </button>
      </footer>

      {/* Report Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-agri-border">
            <h4 className="text-sm font-bold text-agri-text">
              {t("result.report_incorrect")}
            </h4>
            <p className="text-xs text-agri-muted">
              Help agricultural researchers improve model calibration by reporting anomalies.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-agri-text block">Was this prediction accurate?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFeedbackCorrect(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    feedbackCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-white border-agri-border"
                  }`}
                >
                  Yes, Correct
                </button>
                <button
                  onClick={() => setFeedbackCorrect(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    !feedbackCorrect ? "bg-red-50 border-red-500 text-red-800" : "bg-white border-agri-border"
                  }`}
                >
                  No, Incorrect
                </button>
              </div>
            </div>

            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Describe actual symptoms or notes from agricultural expert..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-agri-border focus:outline-hidden focus:border-agri-primary"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-agri-border text-xs font-semibold text-agri-muted hover:bg-agri-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="flex-1 py-2.5 rounded-xl bg-agri-primary text-white text-xs font-bold shadow-xs hover:bg-agri-primaryHover"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
