import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Download,
  Share2,
  Calendar,
  MapPin,
  Sprout,
  ShieldCheck,
  TrendingUp,
  CloudRain,
  Store,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { fetchFarmerReport, fetchSupportedDistricts } from "../services/api";

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  const [district, setDistrict] = useState("Purba Bardhaman");
  const [crop, setCrop] = useState("Potato");
  const [districts, setDistricts] = useState<string[]>(["Purba Bardhaman", "Hooghly", "Nadia", "Bankura"]);
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = (d: string, c: string) => {
    setLoading(true);
    fetchFarmerReport(d, c)
      .then((data) => {
        if (data) setReport(data);
      })
      .catch((err) => console.error("Error loading report:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSupportedDistricts()
      .then((res) => {
        if (res.districts) setDistricts(res.districts);
      })
      .catch(() => {});

    loadReport(district, crop);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28 print:bg-white print:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-5">
        {/* Controls Bar (Hidden during Print) */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-stone-100 text-stone-800 border border-stone-200 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">Farmer Assessment Dossier</h1>
              <p className="text-xs text-stone-500">
                Consolidated agricultural intelligence report with full data provenance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                loadReport(e.target.value, crop);
              }}
              className="p-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={crop}
              onChange={(e) => {
                setCrop(e.target.value);
                loadReport(district, e.target.value);
              }}
              className="p-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
            >
              {["Potato", "Rice", "Tomato", "Maize", "Mustard"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-12 text-center text-xs text-stone-400">Compiling farmer dossier...</div>
        )}

        {report && (
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="border-b border-stone-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  AgriShield AI &bull; Official Assessment
                </span>
                <h2 className="text-2xl font-black text-stone-900 mt-2">
                  Agricultural Intelligence Dossier
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Prepared for: <strong>{report.farmer_name}</strong> &bull; {report.district}, {report.state}
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-stone-500 font-mono">
                <span className="block font-bold text-stone-800">{report.report_id}</span>
                <span>{report.generated_at?.slice(0, 10)}</span>
              </div>
            </div>

            {/* Section 1: Weather & Agro-Risk */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-blue-600" />
                <span>1. Weather Intelligence & Risk (IMD / Open-Meteo)</span>
              </h3>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block">Temperature</span>
                  <span className="font-bold text-stone-900">{report.weather_intelligence.current_temp}°C</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Relative Humidity</span>
                  <span className="font-bold text-stone-900">{report.weather_intelligence.current_rh}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Condition</span>
                  <span className="font-bold text-stone-900">{report.weather_intelligence.condition}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Late Blight Risk</span>
                  <span className="font-bold text-rose-700">{report.weather_intelligence.late_blight_risk}</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-600 mt-2 italic">
                <strong>Advisory:</strong> {report.weather_intelligence.agro_advisory}
              </p>
            </div>

            {/* Section 2: Yield Projection */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>2. Empirical Yield Projection (UPAg / DES MoA&FW)</span>
              </h3>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block">Projected Yield</span>
                  <span className="font-black text-stone-900 text-lg">
                    {report.yield_projection.predicted_yield_t_ha} t/ha
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">80% Prediction Interval</span>
                  <span className="font-bold text-stone-800">
                    {report.yield_projection.prediction_interval.lower_bound_t_ha} - {report.yield_projection.prediction_interval.upper_bound_t_ha} t/ha
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">District Historical Benchmark</span>
                  <span className="font-bold text-stone-800">
                    {report.yield_projection.district_benchmark_t_ha} t/ha ({report.yield_projection.trend})
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Mandi Spot Prices */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-violet-600" />
                <span>3. Wholesale Mandi Spot Prices (Agmarknet)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {report.mandi_spot_prices?.map((m: any, i: number) => (
                  <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="font-bold text-stone-800 block truncate">{m.market}</span>
                    <span className="text-base font-black text-stone-900">₹{m.modal_price}</span>
                    <span className="text-[10px] text-stone-400 block">Range: ₹{m.min_price} - ₹{m.max_price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Recommended Schemes */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                4. Applicable Government Support Schemes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {report.recommended_government_schemes?.map((s: any, i: number) => (
                  <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900 block">{s.name}</span>
                      <span className="text-[10px] text-stone-500">{s.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provenance & Disclaimer Footer */}
            <div className="pt-4 border-t border-stone-200 text-[10px] text-stone-400 space-y-1">
              <p><strong>Data Provenance:</strong> {report.provenance_statement}</p>
              <p>Generated by AgriShield AI Platform &bull; West Bengal Pilot Project &bull; Version 1.0.0</p>
            </div>
          </div>
        )}
      </main>

      <div className="print:hidden">
        <Navigation />
      </div>
    </div>
  );
};
