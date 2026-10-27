import React, { useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { analyzeSoil, fetchSoilBenchmarks } from "../services/api";

export const SoilPage: React.FC = () => {
  const { t } = useTranslation();

  const [ph, setPh] = useState("6.2");
  const [ec, setEc] = useState("0.45");
  const [oc, setOc] = useState("0.65");
  const [n, setN] = useState("310");
  const [p, setP] = useState("18.5");
  const [k, setK] = useState("180");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await analyzeSoil({
        ph: parseFloat(ph),
        electrical_conductivity: parseFloat(ec),
        organic_carbon_pct: parseFloat(oc),
        available_nitrogen: parseFloat(n),
        available_phosphorus: parseFloat(p),
        available_potassium: parseFloat(k),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze soil sample.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-5">
        <div className="mb-5 flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-900">Soil Health & Nutrient Planning</h1>
            <p className="text-xs text-stone-500">
              Diagnostic analysis conforming to official Soil Health Card (DAC&FW) benchmark protocols.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Form */}
          <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
            <h2 className="text-sm font-bold text-stone-900 mb-3">Enter Soil Test Values</h2>

            <form onSubmit={handleAnalyze} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Soil pH (Acidity / Alkalinity)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="11.0"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. 6.5"
                  required
                />
                <span className="text-[10px] text-stone-400">Normal range: 6.5 - 7.5</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Electrical Conductivity (EC, dS/m)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="10.0"
                  value={ec}
                  onChange={(e) => setEc(e.target.value)}
                  className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. 0.4"
                  required
                />
                <span className="text-[10px] text-stone-400">Safe threshold: &lt; 1.0 dS/m</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Organic Carbon (OC, %)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="5.0"
                  value={oc}
                  onChange={(e) => setOc(e.target.value)}
                  className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. 0.65"
                  required
                />
                <span className="text-[10px] text-stone-400">Benchmark: &gt; 0.75% is High</span>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  Primary Nutrients (kg/ha)
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Available Nitrogen (N)</span>
                    <input
                      type="number"
                      value={n}
                      onChange={(e) => setN(e.target.value)}
                      className="w-24 p-1.5 text-right rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Available Phosphorus (P)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={p}
                      onChange={(e) => setP(e.target.value)}
                      className="w-24 p-1.5 text-right rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Available Potassium (K)</span>
                    <input
                      type="number"
                      value={k}
                      onChange={(e) => setK(e.target.value)}
                      className="w-24 p-1.5 text-right rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Test...</span>
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4" />
                    <span>Analyze Soil Report</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Column */}
          <div className="md:col-span-7 space-y-4">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            {!result && !loading && (
              <div className="bg-white rounded-3xl p-8 border border-stone-200/90 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-stone-800 text-sm">No Soil Data Analyzed</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  Enter the parameters from your official Soil Health Card to generate evidence-based fertility scores and crop recommendations.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in fade-in">
                {/* Fertility Score Card */}
                <div className="bg-white rounded-3xl p-5 border border-teal-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider block">
                        Soil Fertility Rating
                      </span>
                      <h3 className="text-xl font-black text-stone-900 mt-0.5">
                        {result.overall_rating}
                      </h3>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-teal-700">
                        {result.fertility_index_score}
                      </span>
                      <span className="text-[9px] font-bold text-teal-600">/ 100</span>
                    </div>
                  </div>

                  {/* Parameter Breakdown */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries(result.parameters).map(([key, val]: [string, any]) => (
                      <div key={key} className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                        <span className="text-[10px] font-bold text-stone-400 uppercase block truncate">
                          {key.replace("_", " ")}
                        </span>
                        <div className="font-black text-stone-900 mt-0.5">
                          {val.value} {val.unit}
                        </div>
                        <span className="text-[10px] font-semibold text-teal-700 block truncate">
                          {val.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specific Soil Amelioration Guidance */}
                <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                    Agronomic Soil Amendment Advice
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                      <strong>pH Management:</strong> {result.parameters.ph.guidance}
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900">
                      <strong>Organic Pool:</strong> {result.parameters.organic_carbon.guidance}
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800">
                      <strong>NPK Balance:</strong> {result.parameters.available_nitrogen.guidance}
                    </div>
                  </div>
                </div>

                {/* Crop Suitability Index */}
                <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                    Soil-Crop Suitability Index
                  </h3>

                  <div className="space-y-2">
                    {result.crop_suitability.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-stone-900 block">{item.crop}</span>
                          <span className="text-[10px] text-stone-500">{item.agronomic_notes}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-teal-700 block text-sm">
                            {item.suitability_score}%
                          </span>
                          <span className="text-[9px] text-stone-400 font-semibold">
                            {item.suitability_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
};
