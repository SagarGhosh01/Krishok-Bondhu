import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  MapPin,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { predictYield, fetchSupportedCrops, fetchSupportedDistricts } from "../services/api";

export const YieldPage: React.FC = () => {
  const { t } = useTranslation();

  const [districts, setDistricts] = useState<string[]>([
    "Purba Bardhaman",
    "Hooghly",
    "Nadia",
    "Bankura",
    "Birbhum",
    "Murshidabad",
    "Malda",
  ]);
  const [selectedDistrict, setSelectedDistrict] = useState("Purba Bardhaman");
  const [selectedCrop, setSelectedCrop] = useState("Potato");
  const [selectedSeason, setSelectedSeason] = useState("Rabi");
  const [areaHectares, setAreaHectares] = useState("1.0");
  const [rainfallMm, setRainfallMm] = useState("65");
  const [tempCelsius, setTempCelsius] = useState("19.5");
  const [irrigationPct, setIrrigationPct] = useState("80");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    fetchSupportedDistricts()
      .then((data) => {
        if (data.districts && data.districts.length > 0) {
          setDistricts(data.districts);
        }
      })
      .catch(() => {});
  }, []);

  // Update default season & weather when crop changes
  useEffect(() => {
    if (selectedCrop === "Potato") {
      setSelectedSeason("Rabi");
      setRainfallMm("65");
      setTempCelsius("19.5");
    } else if (selectedCrop === "Rice") {
      setSelectedSeason("Kharif");
      setRainfallMm("1250");
      setTempCelsius("29.5");
    } else if (selectedCrop === "Tomato") {
      setSelectedSeason("Rabi");
      setRainfallMm("70");
      setTempCelsius("21.0");
    } else if (selectedCrop === "Maize") {
      setSelectedSeason("Kharif");
      setRainfallMm("950");
      setTempCelsius("26.5");
    }
  }, [selectedCrop]);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await predictYield({
        state: "West Bengal",
        district: selectedDistrict,
        crop: selectedCrop,
        season: selectedSeason,
        area_hectares: parseFloat(areaHectares) || 1.0,
        rainfall_mm: parseFloat(rainfallMm) || undefined,
        mean_temperature_celsius: parseFloat(tempCelsius) || undefined,
        irrigation_coverage_pct: parseFloat(irrigationPct) || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate yield projection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-5">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">Crop Yield Forecasting</h1>
              <p className="text-xs text-stone-500">
                Empirical planning projections based on verified UPAg & DES district agricultural statistics.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Form Column */}
          <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
            <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Input Parameters</span>
            </h2>

            <form onSubmit={handlePredict} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Crop</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {["Potato", "Rice", "Tomato", "Maize", "Wheat", "Jute", "Mustard"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Season</label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Rabi">Rabi</option>
                    <option value="Kharif">Kharif</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Area (Hectares)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={areaHectares}
                    onChange={(e) => setAreaHectares(e.target.value)}
                    className="w-full p-2.5 rounded-2xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                    required
                  />
                </div>
              </div>

              {/* Environmental inputs */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  Environmental Conditions
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Seasonal Rainfall (mm)</span>
                    <input
                      type="number"
                      value={rainfallMm}
                      onChange={(e) => setRainfallMm(e.target.value)}
                      className="w-20 p-1.5 text-right rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Mean Temp (°C)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={tempCelsius}
                      onChange={(e) => setTempCelsius(e.target.value)}
                      className="w-20 p-1.5 text-right rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Irrigation Access (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={irrigationPct}
                      onChange={(e) => setIrrigationPct(e.target.value)}
                      className="w-20 p-1.5 text-right rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Computing Projection...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Forecast Expected Yield</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Result Column */}
          <div className="md:col-span-7 space-y-4">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            {!result && !loading && (
              <div className="bg-white rounded-3xl p-8 border border-stone-200/90 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-stone-800 text-sm">No Forecast Generated Yet</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  Select your district, crop, and cultivated acreage, then click "Forecast Expected Yield" to see empirical projections.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in fade-in">
                {/* Main Yield Card */}
                <div className="bg-white rounded-3xl p-5 border border-blue-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      Empirical Forecast
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {result.district} &bull; {result.season}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-stone-900 tracking-tight">
                      {result.predicted_yield_tonnes_per_hectare}
                    </span>
                    <span className="text-sm font-bold text-stone-500">t/ha (Tonnes / Hectare)</span>
                  </div>

                  <div className="mt-2 text-xs text-stone-600 font-medium">
                    Total Estimated Production:{" "}
                    <strong className="text-stone-900 font-bold">
                      {result.predicted_production_tonnes} Metric Tonnes
                    </strong>{" "}
                    across {result.cultivated_area_hectares} ha
                  </div>

                  {/* 80% Confidence Interval */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">
                        80% Prediction Interval
                      </span>
                      <span className="font-bold text-stone-900">
                        {result.prediction_interval_80.lower_bound_t_ha} -{" "}
                        {result.prediction_interval_80.upper_bound_t_ha} t/ha
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-600 text-right max-w-[130px] leading-tight">
                      Reflects normal climate and operational variance
                    </span>
                  </div>

                  {/* Historical Comparison */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-semibold">
                        District Historical Average
                      </span>
                      <span className="font-bold text-stone-800 text-sm">
                        {result.historical_benchmarks.district_historical_mean_t_ha} t/ha
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-semibold">
                        Variance from Benchmark
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          result.historical_benchmarks.variance_from_mean_pct >= 0
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {result.historical_benchmarks.variance_from_mean_pct >= 0 ? "+" : ""}
                        {result.historical_benchmarks.variance_from_mean_pct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Limitations */}
                <div className="bg-amber-50/80 rounded-3xl p-4 border border-amber-200 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Important Agronomic Limitations</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                    {result.important_limitations.map((lim: string, idx: number) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
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
