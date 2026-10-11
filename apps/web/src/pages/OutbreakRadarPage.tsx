import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Radio, AlertTriangle, ShieldAlert, MapPin, Filter, RefreshCw, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigation } from "../components/Navigation";

interface Cluster {
  id: string;
  crop: string;
  disease: string;
  scientific_name: string;
  severity_grade: number;
  reported_cases: number;
  distance_km: number;
  bearing_deg: number;
  relative_x: number;
  relative_y: number;
  alert: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  last_reported: string;
}

export const OutbreakRadarPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectedCrop, setSelectedCrop] = useState<string>("All");
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [threatLevel, setThreatLevel] = useState<string>("ELEVATED");
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or simulate radar data
  const loadRadarData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/outbreak/radar?lat=23.2324&lon=88.3639&radius_km=${radiusKm}&crop=${selectedCrop}`
      );
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters || []);
        setThreatLevel(data.threat_level || "ELEVATED");
        if (data.clusters?.length > 0) setSelectedCluster(data.clusters[0]);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Using offline radar clusters fallback:", e);
    }

    // Offline fallback clusters
    const fallbackClusters: Cluster[] = [
      {
        id: "OB-8421",
        crop: "Tomato",
        disease: "Tomato Early Blight",
        scientific_name: "Alternaria solani",
        severity_grade: 4,
        reported_cases: 18,
        distance_km: Math.round(0.35 * radiusKm * 10) / 10,
        bearing_deg: 45,
        relative_x: 0.25,
        relative_y: -0.25,
        alert: "HIGH",
        last_reported: "2 hours ago",
      },
      {
        id: "OB-8423",
        crop: "Potato",
        disease: "Potato Late Blight",
        scientific_name: "Phytophthora infestans",
        severity_grade: 5,
        reported_cases: 32,
        distance_km: Math.round(0.45 * radiusKm * 10) / 10,
        bearing_deg: 280,
        relative_x: -0.44,
        relative_y: -0.08,
        alert: "CRITICAL",
        last_reported: "1 hour ago",
      },
      {
        id: "OB-8422",
        crop: "Tomato",
        disease: "Tomato Yellow Leaf Curl Virus",
        scientific_name: "Begomovirus",
        severity_grade: 3,
        reported_cases: 9,
        distance_km: Math.round(0.65 * radiusKm * 10) / 10,
        bearing_deg: 140,
        relative_x: 0.42,
        relative_y: 0.50,
        alert: "MODERATE",
        last_reported: "5 hours ago",
      },
    ];

    setClusters(
      selectedCrop === "All"
        ? fallbackClusters
        : fallbackClusters.filter((c) => c.crop.toLowerCase() === selectedCrop.toLowerCase())
    );
    setSelectedCluster(fallbackClusters[0]);
    setLoading(false);
  };

  useEffect(() => {
    loadRadarData();
  }, [radiusKm, selectedCrop]);

  return (
    <div className="min-h-screen bg-agri-bg pb-28 font-sans text-agri-text">
      {/* Top App Bar */}
      <div className="bg-[#232B25] text-white px-5 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold text-base flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-agri-accent animate-pulse" />
                {t("advanced.outbreak_radar_title", "Regional Outbreak Radar")}
              </h1>
              <p className="text-[11px] text-white/60">Geo-Spatial Pathogen Early Warning</p>
            </div>
          </div>
          <button
            onClick={loadRadarData}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Radar Controls */}
        <div className="bg-white p-4 rounded-3xl border border-agri-border shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">
              {t("advanced.radar_radius", "Scan Radius")}:{" "}
              <strong className="text-agri-primary font-bold">{radiusKm} km</strong>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                threatLevel === "ELEVATED"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {threatLevel} Threat
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-agri-primary cursor-pointer"
          />

          <div className="flex items-center gap-2 pt-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            {["All", "Tomato", "Potato", "Corn"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCrop(c)}
                className={`text-xs px-3 py-1 rounded-full transition font-medium ${
                  selectedCrop === c
                    ? "bg-agri-primary text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 2D Animated SVG Radar Screen */}
        <div className="bg-[#18211A] rounded-4xl p-4 shadow-xl border border-agri-border/40 relative overflow-hidden flex flex-col items-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* Range Concentric Circles */}
            <svg className="absolute inset-0 w-full h-full" viewBox="-120 -120 240 240">
              {/* Outer grid rings */}
              <circle cx="0" cy="0" r="110" fill="none" stroke="#2D3B2F" strokeWidth="1" />
              <circle cx="0" cy="0" r="80" fill="none" stroke="#2D3B2F" strokeWidth="1" />
              <circle cx="0" cy="0" r="50" fill="none" stroke="#2D3B2F" strokeWidth="1" />
              <circle cx="0" cy="0" r="20" fill="none" stroke="#2D3B2F" strokeWidth="1" />

              {/* Crosshair lines */}
              <line x1="-115" y1="0" x2="115" y2="0" stroke="#2D3B2F" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="-115" x2="0" y2="115" stroke="#2D3B2F" strokeWidth="1" strokeDasharray="3 3" />

              {/* Range labels */}
              <text x="5" y="-22" fill="#5A735E" fontSize="7" fontFamily="sans-serif">
                {Math.round(radiusKm * 0.2)}k
              </text>
              <text x="5" y="-52" fill="#5A735E" fontSize="7" fontFamily="sans-serif">
                {Math.round(radiusKm * 0.5)}k
              </text>
              <text x="5" y="-82" fill="#5A735E" fontSize="7" fontFamily="sans-serif">
                {Math.round(radiusKm * 0.8)}k
              </text>
              <text x="5" y="-112" fill="#5A735E" fontSize="7" fontFamily="sans-serif">
                {radiusKm}km
              </text>

              {/* Rotating radar sweep beam */}
              <g className="animate-spin origin-center" style={{ animationDuration: "6s" }}>
                <defs>
                  <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#466543" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#466543" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0 0 L 0 -115 A 115 115 0 0 1 115 0 Z" fill="url(#sweepGradient)" />
              </g>

              {/* Center User Farm Marker */}
              <circle cx="0" cy="0" r="4" fill="#E8F0E6" />
              <circle cx="0" cy="0" r="8" fill="none" stroke="#7BA876" strokeWidth="1" className="animate-ping" />
            </svg>

            {/* Clickable Cluster Blips */}
            {clusters.map((cl) => {
              const xPos = 50 + cl.relative_x * 45; // percentage
              const yPos = 50 + cl.relative_y * 45;
              const isSelected = selectedCluster?.id === cl.id;

              return (
                <button
                  key={cl.id}
                  onClick={() => setSelectedCluster(cl)}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group focus:outline-none z-10"
                >
                  <span
                    className={`block w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform ${
                      cl.alert === "CRITICAL"
                        ? "bg-red-500 animate-pulse"
                        : cl.alert === "HIGH"
                        ? "bg-amber-500"
                        : "bg-yellow-400"
                    } ${isSelected ? "scale-150 ring-4 ring-white/30" : "hover:scale-125"}`}
                  />
                  <span className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {cl.disease} ({cl.distance_km} km)
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-white/50 text-center mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> Tap blips to view cluster outbreak intelligence
          </p>
        </div>

        {/* Selected Cluster Detail */}
        {selectedCluster && (
          <div className="bg-white p-5 rounded-3xl border border-agri-border shadow-md space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-agri-primary">
                  {selectedCluster.crop} | {selectedCluster.id}
                </span>
                <h3 className="text-base font-bold text-agri-text leading-tight">
                  {selectedCluster.disease}
                </h3>
                <p className="text-xs text-stone-500 italic">
                  {selectedCluster.scientific_name}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedCluster.alert === "CRITICAL"
                    ? "bg-red-100 text-red-800"
                    : selectedCluster.alert === "HIGH"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {selectedCluster.alert}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-agri-bg p-3 rounded-2xl text-center text-xs">
              <div>
                <span className="text-[10px] text-stone-500 block">Distance</span>
                <span className="font-bold text-agri-text">{selectedCluster.distance_km} km</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Severity</span>
                <span className="font-bold text-agri-text">Grade {selectedCluster.severity_grade} / 5</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Reported Cases</span>
                <span className="font-bold text-agri-text">{selectedCluster.reported_cases} farms</span>
              </div>
            </div>

            <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-xs text-red-900 leading-relaxed">
              <strong className="block font-semibold mb-0.5">⚠️ Neighbor Contagion Alert:</strong>
              {selectedCluster.alert === "CRITICAL"
                ? "High spore dispersal probability with windward drift. Spray preventive copper-based barrier or bio-fungicide immediately."
                : "Active cluster nearby. Inspect underside of foliage for water-soaked lesions or powdering."}
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};
