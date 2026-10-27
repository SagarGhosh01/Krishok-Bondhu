import React from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  TrendingUp,
  CloudRain,
  Store,
  FlaskConical,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  const coreModules = [
    {
      title: "Crop Disease Screening",
      desc: "Instant leaf diagnostic screening for 17 crop conditions with calibrated confidence, Grad-CAM visual heatmaps, and extension officer escalation.",
      icon: ScanLine,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      link: "/recognize",
      badge: "MobileNetV3 Edge Inference",
    },
    {
      title: "Empirical Yield Forecasting",
      desc: "Empirical district-level yield forecasting (t/ha) and production estimates using official UPAg / DES historical statistics with 80% prediction intervals.",
      icon: TrendingUp,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      link: "/yield",
      badge: "Trained on Official MoA Data",
    },
    {
      title: "Weather & Agro-Risk Alert",
      desc: "5-day meteorological forecasts combined with Wallin's Late Blight Severity Values (BSV), drought stress, and waterlogging alerts.",
      icon: CloudRain,
      color: "bg-amber-50 text-amber-700 border-amber-200",
      link: "/weather",
      badge: "Open-Meteo & IMD Norms",
    },
    {
      title: "Mandi Price Intelligence",
      desc: "Verified daily wholesale spot prices, modal price trends, and arrival volumes from Agmarknet across West Bengal and major Indian mandis.",
      icon: Store,
      color: "bg-violet-50 text-violet-700 border-violet-200",
      link: "/mandi",
      badge: "Agmarknet APMC Feed",
    },
    {
      title: "Soil Health & Nutrient Planning",
      desc: "Laboratory soil-test analysis matching official Soil Health Card criteria for pH, EC, OC, N-P-K, with personalized amelioration guidelines.",
      icon: FlaskConical,
      color: "bg-teal-50 text-teal-700 border-teal-200",
      link: "/soil",
      badge: "Soil Health Card Standards",
    },
    {
      title: "Government Schemes Directory",
      desc: "Searchable repository of Central & West Bengal agricultural welfare schemes (PM-KISAN, Bangla Shasya Bima, Krishak Bandhu, KCC).",
      icon: Landmark,
      color: "bg-rose-50 text-rose-700 border-rose-200",
      link: "/schemes",
      badge: "Verified .gov.in Portals",
    },
  ];

  const officialSources = [
    { name: "UPAg Portal", publisher: "DA&FW, MoA&FW, GoI", url: "https://upag.gov.in" },
    { name: "Open Government Data (OGD)", publisher: "NIC, MeitY, GoI", url: "https://data.gov.in" },
    { name: "India Meteorological Dept", publisher: "Ministry of Earth Sciences", url: "https://mausam.imd.gov.in" },
    { name: "Agmarknet Network", publisher: "DMI, MoA&FW, GoI", url: "https://agmarknet.gov.in" },
    { name: "Soil Health Card Portal", publisher: "DAC&FW, MoA&FW", url: "https://soilhealth.dac.gov.in" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilot: West Bengal &bull; Multi-State Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            AgriShield <span className="text-agri-primary">AI</span>
          </h1>
          <p className="mt-2 text-base sm:text-lg font-medium text-stone-600">
            Smarter Farming. Safer Crops. Better Decisions.
          </p>

          <p className="mt-4 text-xs sm:text-sm text-stone-500 leading-relaxed">
            An open, production-minded decision-support platform combining verified Indian government data,
            deep learning disease screening, empirical yield forecasting, mandi intelligence, and actionable agro-advisories.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/recognize"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-agri-primary hover:bg-agri-primaryHover text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <ScanLine className="w-4 h-4" />
              <span>Check My Crop Now</span>
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-agri-border hover:bg-stone-50 text-stone-800 font-bold text-sm shadow-xs flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <span>Open Farmer Dashboard</span>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Question Cards */}
      <section className="px-4 max-w-5xl mx-auto mt-2">
        <div className="border-t border-stone-200/80 pt-6 mb-6">
          <h2 className="text-lg font-bold text-stone-900">What Can AgriShield AI Answer For You?</h2>
          <p className="text-xs text-stone-500">Six essential agricultural questions answered with transparent evidence.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreModules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Link
                key={idx}
                to={mod.link}
                className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-emerald-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm group-hover:text-emerald-700 transition">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                  <span>Explore Feature</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Official Data Governance & Provenance */}
      <section className="px-4 max-w-5xl mx-auto mt-10">
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">Verified Official Data Governance</h2>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed mb-4">
            AgriShield AI is built on non-negotiable data integrity. We do not fabricate API responses, dataset statistics, or agronomic recommendations.
            All statistics, wholesale prices, and weather observations originate from documented public portals.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {officialSources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-stone-50 hover:bg-emerald-50/60 border border-stone-200 text-left transition block"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-xs">{src.name}</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1 truncate">{src.publisher}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Honest AI & Medical Disclaimer */}
      <section className="px-4 max-w-5xl mx-auto mt-6">
        <div className="bg-amber-50/80 rounded-3xl p-5 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold">Important Agricultural Screening Disclaimer:</p>
            <p className="leading-relaxed">
              AgriShield AI is an educational and advisory screening aid. It does not replace certified agronomists, state agricultural universities (SAUs), laboratory pathology tests, or official IMD weather alerts. High model confidence does not guarantee biological certainty. Chemical dosages must always follow certified local extension officer instructions.
            </p>
          </div>
        </div>
      </section>

      <Navigation />
    </div>
  );
};
