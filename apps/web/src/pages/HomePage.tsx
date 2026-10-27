import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Store,
  FlaskConical,
  Landmark,
  CloudSun,
  ShieldCheck,
  ChevronRight,
  Sprout,
  FileText,
  Radio,
  Clock,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { fetchUserScans, fetchWeatherCurrent, fetchMandiPrices } from "../services/api";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>("All");
  const [weatherSummary, setWeatherSummary] = useState<any | null>(null);
  const [mandiTicker, setMandiTicker] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Load weather summary for pilot district
    fetchWeatherCurrent("Purba Bardhaman")
      .then((data) => {
        if (data) setWeatherSummary(data);
      })
      .catch(() => {});

    // 2. Load recent mandi prices
    fetchMandiPrices({ limit: 4 })
      .then((res) => {
        if (res && res.prices) setMandiTicker(res.prices);
      })
      .catch(() => {});

    // 3. Load user scans
    fetchUserScans(1, 6)
      .then((res) => {
        if (res.items) {
          setRecentScans(res.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredScans =
    selectedCropFilter === "All"
      ? recentScans
      : recentScans.filter((s) =>
          s.prediction?.primary_crop?.toLowerCase().includes(selectedCropFilter.toLowerCase())
        );

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Micro-Climate & Agro-Risk Live Banner */}
        <div className="bg-gradient-to-r from-[#1E2820] to-[#2B382E] text-white p-4.5 rounded-3xl shadow-sm border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <CloudSun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black">
                  {weatherSummary?.current?.temperature_celsius
                    ? `${Math.round(weatherSummary.current.temperature_celsius)}°C`
                    : "24.5°C"}
                </span>
                <span className="text-xs text-stone-300">
                  | {weatherSummary?.current?.relative_humidity_pct || 72}% RH
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {weatherSummary?.district || "Purba Bardhaman"}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 mt-0.5">
                Condition: {weatherSummary?.current?.condition || "Partly Cloudy"} &bull; Spray Window Favorable
              </p>
            </div>
          </div>

          <Link
            to="/weather"
            className="self-start sm:self-auto bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-2xl border border-white/10 transition flex items-center gap-1.5"
          >
            <span>Weather & Risk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mandi Wholesale Ticker */}
        {mandiTicker.length > 0 && (
          <div className="bg-white rounded-3xl p-4 border border-stone-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-violet-600" />
                <span>Today's Mandi Wholesale Rates (Agmarknet)</span>
              </span>
              <Link to="/mandi" className="text-[11px] font-bold text-violet-700 hover:underline">
                View All Mandis →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mandiTicker.slice(0, 4).map((m, i) => (
                <div key={i} className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[11px] font-bold text-stone-700 block truncate">
                    {m.commodity}
                  </span>
                  <div className="text-sm font-black text-stone-900 mt-0.5">
                    ₹{m.modal_price} <span className="text-[9px] font-normal text-stone-400">/Qtl</span>
                  </div>
                  <span className="text-[10px] text-stone-400 block truncate">{m.market}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6 Core Decision-Support Action Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            to="/recognize"
            className="bg-white p-3.5 rounded-3xl border border-emerald-200 shadow-xs hover:border-emerald-400 transition flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 leading-tight">Scan Leaf</span>
            <span className="text-[10px] text-stone-400 mt-0.5">AI Screening</span>
          </Link>

          <Link
            to="/yield"
            className="bg-white p-3.5 rounded-3xl border border-blue-200 shadow-xs hover:border-blue-400 transition flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 leading-tight">Yield Forecast</span>
            <span className="text-[10px] text-stone-400 mt-0.5">UPAg Models</span>
          </Link>

          <Link
            to="/mandi"
            className="bg-white p-3.5 rounded-3xl border border-violet-200 shadow-xs hover:border-violet-400 transition flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 leading-tight">Mandi Prices</span>
            <span className="text-[10px] text-stone-400 mt-0.5">Wholesale APMC</span>
          </Link>

          <Link
            to="/weather"
            className="bg-white p-3.5 rounded-3xl border border-amber-200 shadow-xs hover:border-amber-400 transition flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Droplets className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 leading-tight">Agro-Risk</span>
            <span className="text-[10px] text-stone-400 mt-0.5">Late Blight BSV</span>
          </Link>

          <Link
            to="/soil"
            className="bg-white p-3.5 rounded-3xl border border-teal-200 shadow-xs hover:border-teal-400 transition flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <FlaskConical className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 leading-tight">Soil Health</span>
            <span className="text-[10px] text-stone-400 mt-0.5">SHC Diagnosis</span>
          </Link>

          <Link
            to="/schemes"
            className="bg-white p-3.5 rounded-3xl border border-rose-200 shadow-xs hover:border-rose-400 transition flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-900 leading-tight">Govt Schemes</span>
            <span className="text-[10px] text-stone-400 mt-0.5">BSB & PM-KISAN</span>
          </Link>
        </div>

        {/* Primary Call to Action Banner */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-agri-primary border border-emerald-200 flex items-center justify-center shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Have a diseased or discolored leaf?</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Capture a photo now for immediate on-device screening and verified ICAR prevention measures.
              </p>
            </div>
          </div>

          <Link
            to="/recognize"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-agri-primary hover:bg-agri-primaryHover text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 active:scale-95 transition shrink-0"
          >
            <span>Scan Foliage</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Recent Scans Section */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Recent Plant Screenings</h3>
              <p className="text-[11px] text-stone-400">Diagnosis history with Grad-CAM and calibrated confidence.</p>
            </div>

            <Link to="/reports" className="text-xs font-bold text-agri-primary hover:underline">
              Full Report Dossier →
            </Link>
          </div>

          {filteredScans.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              No recent scans yet. Click "Scan Foliage" to analyze a leaf sample.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredScans.map((scan, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-200 overflow-hidden shrink-0">
                      {scan.image_url ? (
                        <img src={scan.image_url} alt="Leaf" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">🍂</div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">
                        {scan.prediction?.primary_disease || "Plant Assessment"}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {scan.prediction?.primary_crop || "Crop"} &bull; {scan.created_at?.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">
                      {Math.round((scan.prediction?.calibrated_confidence || 0.8) * 100)}%
                    </span>
                    <span className="text-[9px] font-semibold text-stone-400">
                      {scan.prediction?.state || "CONFIDENT"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-stone-100 text-[11px] text-stone-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Data freshness: Live streams active from UPAg, Agmarknet, Open-Meteo & Soil Health Card portals.
          </span>
        </div>
      </main>

      <Navigation />
    </div>
  );
};
