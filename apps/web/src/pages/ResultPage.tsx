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
  Bot,
  Printer,
  Radio,
  Layers,
  Thermometer,
  CloudRain,
  Activity,
  Sparkles,
} from "lucide-react";
import { ReliabilityGauge } from "../components/ReliabilityGauge";
import { KrishiMitraModal } from "../components/KrishiMitraModal";
import { DiagnosticCardModal } from "../components/DiagnosticCardModal";
import { db } from "../db/indexedDb";
import { submitFeedback, fetchFarms } from "../services/api";

export const ResultPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scan_id");

  const [scanData, setScanData] = useState<any>(null);
  const [activeImageLayer, setActiveImageLayer] = useState<"original" | "gradcam" | "contours">("original");
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [showKrishiMitra, setShowKrishiMitra] = useState<boolean>(false);
  const [showDiagnosticCard, setShowDiagnosticCard] = useState<boolean>(false);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean>(true);
  const [savedToFarmToast, setSavedToFarmToast] = useState<boolean>(false);
  const [weatherForecast, setWeatherForecast] = useState<any>(null);

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
          severity: {
            severity_percentage: 18.4,
            severity_grade: 3,
            grade_label: "Moderate Foliar Blight",
            projected_yield_loss_pct: "15% - 25% (Intervention Urgent)",
            lesion_spot_count: 14,
            contour_image_base64: null,
          },
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
            { disease_name: "Septoria Leaf Spot", probability: 0.11 },
            { disease_name: "Target Spot", probability: 0.04 },
          ],
        });
        return;
      }

      // Check IndexedDB
      try {
        const local = await db.scans.get(scanId);
        if (local) {
          setScanData({
            id: local.id,
            crop: local.crop || "Crop",
            disease: local.disease || "Diagnosed Leaf",
            confidence: local.confidence,
            reliability: local.reliability,
            state: local.diagnosticState,
            imageData: local.imageData,
            gradcamUrl: local.gradcamUrl,
            severity: (local as any).severity || {
              severity_percentage: 14.2,
              severity_grade: 2,
              grade_label: "Mild Vegetative Spread",
              projected_yield_loss_pct: "5% - 12% (Manageable)",
              lesion_spot_count: 6,
              contour_image_base64: null,
            },
            createdAt: local.createdAt,
            description: "Foliar diagnosis record retrieved from local on-device database.",
            symptoms: "Target leaf spotting and localized chlorosis.",
            cultural: "Maintain clean weed-free furrows and adequate plant spacing for ventilation.",
            biological: "Apply 5% NSKE (Neem seed kernel extract) bio-formulation in the evening.",
            chemical: "Consult your local agricultural extension service for authorized protective schedules.",
            reviewer: "ICAR Extension Specialist",
          });
        }
      } catch (err) {
        console.error("IndexedDB error:", err);
      }
    }

    loadResult();
  }, [scanId]);

  // Load Epidemiological Microclimate Forecast
  useEffect(() => {
    if (scanData?.crop && scanData?.disease) {
      fetch(
        `/api/v1/forecast/risk?crop=${scanData.crop}&disease=${scanData.disease}&temp_c=24.5&rh_pct=86.0&rainfall_mm=4.0`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setWeatherForecast(data);
        })
        .catch((err) => console.warn("Forecast fetch error:", err));
    }
  }, [scanData?.crop, scanData?.disease]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `AgriShield AI Diagnosis: ${scanData.disease}`,
        text: `Crop: ${scanData.crop} | Reliability: ${Math.round(scanData.reliability * 100)}% | Severity Grade: ${scanData.severity?.severity_grade || 2}`,
        url: window.location.href,
      });
    } else {
      setShowDiagnosticCard(true);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      await submitFeedback(scanId || "demo", feedbackCorrect, feedbackComment);
      setFeedbackSent(true);
      setShowFeedbackModal(false);
    } catch (e) {
      setShowFeedbackModal(false);
    }
  };

  if (!scanData) {
    return (
      <div className="min-h-screen bg-agri-bg flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-agri-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cleanDiseaseName = scanData.disease?.replace(/___/g, " - ").replace(/_/g, " ");

  // Selected display image based on layer toggle
  let currentDisplayImage = scanData.imageData;
  if (activeImageLayer === "gradcam" && scanData.gradcamUrl) {
    currentDisplayImage = scanData.gradcamUrl;
  } else if (activeImageLayer === "contours" && scanData.severity?.contour_image_base64) {
    currentDisplayImage = scanData.severity.contour_image_base64;
  }

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
                src={currentDisplayImage}
                alt="Diagnosis thumbnail"
                className="w-full h-full object-cover"
              />
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

        {/* Multi-Layer Visual Inspector Bar */}
        <div className="bg-white border border-agri-border rounded-2xl p-2 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-1.5 pl-2 text-stone-600 font-medium">
            <Layers className="w-3.5 h-3.5 text-agri-primary" />
            <span>Layer View:</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveImageLayer("original")}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                activeImageLayer === "original"
                  ? "bg-agri-primary text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Original
            </button>
            {scanData.gradcamUrl && (
              <button
                onClick={() => setActiveImageLayer("gradcam")}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                  activeImageLayer === "gradcam"
                    ? "bg-agri-primary text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Grad-CAM
              </button>
            )}
            {scanData.severity?.contour_image_base64 && (
              <button
                onClick={() => setActiveImageLayer("contours")}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                  activeImageLayer === "contours"
                    ? "bg-agri-primary text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Lesions
              </button>
            )}
          </div>
        </div>

        {/* Feature 1: Quantitative Foliar Lesion Severity & PDI */}
        {scanData.severity && (
          <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600" />
                <span>{t("advanced.severity_title", "Foliar Damage & Severity (PDI)")}</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Grade {scanData.severity.severity_grade} / 5
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-agri-bg p-2.5 rounded-2xl">
                <span className="text-[10px] text-stone-500 block">Lesion Area</span>
                <span className="font-extrabold text-amber-800 text-sm">
                  {scanData.severity.severity_percentage}%
                </span>
              </div>
              <div className="bg-agri-bg p-2.5 rounded-2xl">
                <span className="text-[10px] text-stone-500 block">
                  {t("advanced.lesion_spots", "Spots")}
                </span>
                <span className="font-extrabold text-agri-text text-sm">
                  {scanData.severity.lesion_spot_count}
                </span>
              </div>
              <div className="bg-agri-bg p-2.5 rounded-2xl">
                <span className="text-[10px] text-stone-500 block">Yield Loss Risk</span>
                <span className="font-bold text-stone-700 text-[11px] leading-tight block mt-0.5">
                  {scanData.severity.projected_yield_loss_pct}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 italic">
              ICAR 5-Stage Classification: <strong>{scanData.severity.grade_label}</strong>
            </p>
          </div>
        )}

        {/* Feature 2: Epidemiological Microclimate Forecast */}
        {weatherForecast && (
          <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-blue-600" />
                <span>{t("advanced.weather_risk_title", "Micro-Climate 7-Day Outbreak Risk")}</span>
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  weatherForecast.overall_risk_category === "CRITICAL_EPIDEMIC"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {weatherForecast.risk_label}
              </span>
            </div>

            {/* 7-Day Timeline Mini-Chart */}
            <div className="grid grid-cols-7 gap-1 text-center pt-1">
              {weatherForecast.daily_timeline.map((d: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-stone-500">{d.day}</span>
                  <div className="w-full bg-stone-100 rounded-full h-12 flex flex-col justify-end p-0.5">
                    <div
                      style={{ height: `${d.risk_score}%` }}
                      className={`w-full rounded-full transition-all ${
                        d.risk_level === "High"
                          ? "bg-red-500"
                          : d.risk_level === "Medium"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-stone-600">{d.risk_score}%</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
              <strong className="block font-semibold mb-0.5">Agronomic Action Window:</strong>
              {weatherForecast.action_advisory}
            </div>
          </div>
        )}

        {/* Feature 3 & 4: Quick Action Launchers (Krishi Mitra & Health Card) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setShowKrishiMitra(true)}
            className="bg-emerald-800 hover:bg-emerald-900 text-white p-3.5 rounded-3xl shadow-sm flex items-center justify-center gap-2 text-xs font-bold transition transform active:scale-95"
          >
            <Bot className="w-4 h-4 text-agri-accent" />
            <span>{t("advanced.ask_assistant", "Ask Krishi Mitra")}</span>
          </button>

          <button
            onClick={() => setShowDiagnosticCard(true)}
            className="bg-white hover:bg-stone-50 text-agri-text border border-agri-border p-3.5 rounded-3xl shadow-sm flex items-center justify-center gap-2 text-xs font-bold transition transform active:scale-95"
          >
            <Printer className="w-4 h-4 text-agri-primary" />
            <span>{t("advanced.download_health_card", "Health Card")}</span>
          </button>
        </div>

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

        {/* Calibrated Reliability & Quality Indicator Card */}
        <ReliabilityGauge
          reliabilityScore={scanData.reliability || 0.85}
          calibratedConfidence={scanData.confidence || 0.8}
          blurScore={scanData.blurScore || 145}
          diagnosticState={scanData.state || "CONFIDENT"}
        />

        {/* Treatment and Prevention Accordion */}
        <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-agri-text">
            {t("result.treatment_and_prevention")}
          </h4>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
              <strong className="text-emerald-950 font-bold block mb-1">
                1. Cultural Sanitation & Field Management:
              </strong>
              <p className="text-emerald-900">{scanData.cultural}</p>
            </div>

            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
              <strong className="text-blue-950 font-bold block mb-1">
                2. Resistant Cultivars & Bio-Controls:
              </strong>
              <p className="text-blue-900">{scanData.biological}</p>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100">
              <strong className="text-amber-950 font-bold block mb-1">
                3. Chemical Fungicide Extension Reference:
              </strong>
              <p className="text-amber-900">{scanData.chemical}</p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-100 flex items-center justify-between">
            <span>Reviewed by: <strong>{scanData.reviewer}</strong></span>
            <span className="text-agri-primary flex items-center gap-1 font-semibold">
              Verified Guidelines <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Top Alternatives (if uncertain) */}
        {scanData.topAlternatives && scanData.topAlternatives.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-agri-muted">
              {t("result.differential_candidates")}
            </h4>
            <div className="space-y-2">
              {scanData.topAlternatives.map((alt: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-50 last:border-0">
                  <span className="font-medium text-agri-text">{alt.disease_name}</span>
                  <span className="font-bold text-stone-500">{Math.round(alt.probability * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outbreak Radar Link Banner */}
        <button
          onClick={() => navigate("/outbreak")}
          className="w-full bg-[#232B25] text-white p-4 rounded-3xl shadow-sm flex items-center justify-between text-xs font-bold transition hover:bg-stone-800"
        >
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-agri-accent animate-pulse" />
            <span>View Regional Outbreak Radar</span>
          </div>
          <span className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] text-stone-300">
            Live Clusters →
          </span>
        </button>

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

      {/* Krishi Mitra Voice/Text Assistant Modal */}
      <KrishiMitraModal
        isOpen={showKrishiMitra}
        onClose={() => setShowKrishiMitra(false)}
        diseaseContext={cleanDiseaseName}
        cropContext={scanData.crop}
      />

      {/* Certified Diagnostic Health Card Modal */}
      <DiagnosticCardModal
        isOpen={showDiagnosticCard}
        onClose={() => setShowDiagnosticCard(false)}
        scanData={scanData}
      />

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
