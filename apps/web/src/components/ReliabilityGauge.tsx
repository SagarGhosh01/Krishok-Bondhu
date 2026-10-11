import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, AlertCircle, Info } from "lucide-react";

interface ReliabilityGaugeProps {
  reliabilityScore: number; // 0.0 to 1.0
  calibratedConfidence: number; // 0.0 to 1.0
  blurScore?: number;
  diagnosticState: string;
}

export const ReliabilityGauge: React.FC<ReliabilityGaugeProps> = ({
  reliabilityScore,
  calibratedConfidence,
  blurScore,
  diagnosticState,
}) => {
  const { t } = useTranslation();
  const percentage = Math.round(reliabilityScore * 100);

  // Gradient color based on reliability
  let barColor = "bg-gradient-to-r from-emerald-400 to-agri-primary";
  if (reliabilityScore < 0.4) {
    barColor = "bg-gradient-to-r from-red-400 to-amber-500";
  } else if (reliabilityScore < 0.7) {
    barColor = "bg-gradient-to-r from-amber-400 to-emerald-500";
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3">
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-agri-primary" />
          <h4 className="text-xs font-semibold text-agri-text uppercase tracking-wider">
            {t("result.uncertainty_reliability")}
          </h4>
        </div>
        <span className="text-xs font-bold text-agri-primary bg-agri-surface px-2.5 py-1 rounded-full border border-agri-border">
          {percentage}% Reliability
        </span>
      </div>

      {/* Track and slider bar */}
      <div className="space-y-1">
        <div className="relative w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-agri-border/50">
          <div
            className={`h-full transition-all duration-700 rounded-full ${barColor}`}
            style={{ width: `${Math.max(5, percentage)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-agri-muted font-medium px-1">
          <span>{t("result.low")}</span>
          <span>{t("result.high")}</span>
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100 text-[11px]">
        <div className="bg-agri-surface p-2 rounded-xl">
          <span className="text-agri-muted block">{t("result.calibrated_conf")}</span>
          <span className="font-semibold text-agri-text">
            {(calibratedConfidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-agri-surface p-2 rounded-xl">
          <span className="text-agri-muted block">{t("result.image_quality")}</span>
          <span className="font-semibold text-agri-text">
            {blurScore ? blurScore.toFixed(0) : "Good"} (Laplacian)
          </span>
        </div>
      </div>

      <p className="text-[10px] text-agri-muted leading-tight flex items-start gap-1">
        <Info className="w-3 h-3 text-agri-primary shrink-0 mt-0.5" />
        Calibrated across temperature scaling and edge sharpness. High confidence is an aid, not a laboratory confirmation.
      </p>
    </div>
  );
};
