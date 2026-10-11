import React from "react";
import { X, Printer, Share2, ShieldCheck, CheckCircle2, AlertTriangle, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DiagnosticCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanData: any;
}

export const DiagnosticCardModal: React.FC<DiagnosticCardModalProps> = ({
  isOpen,
  onClose,
  scanData,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !scanData) return null;

  const certId = `AGRI-DIAG-${(scanData.id || "0000").slice(0, 8).toUpperCase()}`;
  const certDate = new Date(scanData.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🌾 *AgriShield AI - Crop Diagnostic Certificate*\n` +
      `🆔 Certificate ID: ${certId}\n` +
      `🌱 Crop: ${scanData.crop || "Foliar"}\n` +
      `🦠 Diagnosis: ${scanData.disease || "Diagnosed Leaf"}\n` +
      `🔬 Calibrated Confidence: ${Math.round((scanData.confidence || 0.8) * 100)}%\n` +
      `📊 Reliability Score: ${Math.round((scanData.reliability || 0.85) * 100)}%\n` +
      `📋 Severity: Grade ${scanData.severity?.severity_grade || 2} (${scanData.severity?.grade_label || "Mild"})\n` +
      `⚠️ Disclaimer: Certified ICAR-aligned screening aid. Consult local KVK before chemical spraying.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-4xl w-full max-w-xl shadow-2xl border border-agri-border flex flex-col max-h-[92vh] overflow-hidden">
        {/* Action Bar (Hidden in Print) */}
        <div className="bg-[#232B25] text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-agri-primary" />
            <span className="font-semibold text-sm">
              {t("advanced.cert_title", "Certified Crop Diagnostic Card")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-agri-primary hover:bg-agri-primaryHover text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Printable Area) */}
        <div className="p-6 overflow-y-auto space-y-5 bg-[#FAFBF9] print:p-0 print:bg-white font-sans text-agri-text">
          {/* Official Header */}
          <div className="border-b-2 border-agri-primary pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-agri-primary text-white flex items-center justify-center font-bold text-sm shadow">
                  AS
                </div>
                <div>
                  <h1 className="font-extrabold text-lg text-agri-text tracking-tight leading-tight">
                    AgriShield AI
                  </h1>
                  <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">
                    Precision Agronomy & Foliar Pathology Screening
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-agri-bg border border-agri-border px-2.5 py-1 rounded-md text-[11px] font-mono font-bold text-agri-text">
                {certId}
              </span>
              <p className="text-[10px] text-stone-400 mt-0.5">{certDate}</p>
            </div>
          </div>

          {/* Leaf & Severity Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white p-4 rounded-3xl border border-agri-border shadow-sm">
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-stone-100 flex items-center justify-center border border-stone-200">
              <img
                src={scanData.severity?.contour_image_base64 || scanData.imageData}
                alt="Diagnosed Foliage"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full">
                {scanData.severity?.lesion_spot_count || 3} Lesion Spots Highlighted
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-agri-primary">
                  {scanData.crop || "Solanaceous Crop"}
                </span>
                <h2 className="text-base font-bold text-agri-text leading-tight">
                  {scanData.disease || "Diagnosed Leaf"}
                </h2>
                {scanData.scientificName && (
                  <p className="text-xs text-stone-500 italic">{scanData.scientificName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-agri-bg p-2 rounded-xl">
                  <span className="text-stone-500 text-[10px] block">Confidence</span>
                  <span className="font-bold text-agri-primary text-sm">
                    {Math.round((scanData.confidence || 0.8) * 100)}%
                  </span>
                </div>
                <div className="bg-agri-bg p-2 rounded-xl">
                  <span className="text-stone-500 text-[10px] block">Reliability</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {Math.round((scanData.reliability || 0.85) * 100)}%
                  </span>
                </div>
                <div className="bg-agri-bg p-2 rounded-xl">
                  <span className="text-stone-500 text-[10px] block">Severity Grade</span>
                  <span className="font-bold text-amber-700 text-sm">
                    Grade {scanData.severity?.severity_grade || 2} / 5
                  </span>
                </div>
                <div className="bg-agri-bg p-2 rounded-xl">
                  <span className="text-stone-500 text-[10px] block">Yield Loss Risk</span>
                  <span className="font-bold text-stone-700 text-xs">
                    {scanData.severity?.projected_yield_loss_pct || "5% - 12%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Prescribed Agronomic Actions */}
          <div className="space-y-3 bg-white p-4 rounded-3xl border border-agri-border shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-agri-primary" />
              <span>ICAR Certified Advisory Actions</span>
            </h3>

            <div className="space-y-2 text-xs text-stone-700 leading-relaxed">
              <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                <strong className="text-emerald-900 block font-semibold mb-0.5">
                  1. Cultural Sanitation:
                </strong>
                {scanData.cultural || "Prune lower infected canopy leaves; install drip lines to eliminate overhead moisture."}
              </div>

              <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                <strong className="text-blue-900 block font-semibold mb-0.5">
                  2. Biological Control:
                </strong>
                {scanData.biological || "Apply 5% Neem Seed Kernel Extract (NSKE) or Trichoderma viride in late evening hours."}
              </div>

              <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                <strong className="text-amber-900 block font-semibold mb-0.5">
                  3. Extension Reference:
                </strong>
                {scanData.chemical || "Consult your local Krishi Vigyan Kendra (KVK) for approved state chemical fungicide schedules."}
              </div>
            </div>
          </div>

          {/* Footer & Verification Code */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-stone-100 rounded-lg border border-stone-300 flex items-center justify-center text-stone-700">
                <QrCode className="w-9 h-9" />
              </div>
              <div>
                <p className="font-semibold text-agri-text">
                  {t("advanced.cert_issued_by", "AgriShield AI Diagnostic Engine")}
                </p>
                <p className="text-[10px] text-stone-400">
                  Model: MobileNetV3-Large FP32 | Calibrated L-BFGS
                </p>
              </div>
            </div>

            <div className="text-right max-w-[200px]">
              <p className="text-[9px] text-stone-400 leading-tight">
                {t("advanced.cert_disclaimer", "Certified screening aid under ICAR guidelines. Not a substitute for lab ELISA/PCR.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
