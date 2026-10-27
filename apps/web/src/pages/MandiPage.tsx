import React, { useState, useEffect } from "react";
import {
  Store,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Search,
  RefreshCw,
  ExternalLink,
  Info,
  Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import {
  fetchMandiPrices,
  fetchMandiTrends,
  fetchMandiSpread,
  fetchMandiCommodities,
  fetchSupportedDistricts,
} from "../services/api";

export const MandiPage: React.FC = () => {
  const { t } = useTranslation();

  const [commodities, setCommodities] = useState<string[]>([
    "Potato",
    "Tomato",
    "Paddy(Dhan)",
    "Maize",
    "Mustard",
    "Jute",
  ]);
  const [districts, setDistricts] = useState<string[]>([
    "All",
    "Purba Bardhaman",
    "Hooghly",
    "Nadia",
    "Bankura",
    "Birbhum",
    "Malda",
    "Murshidabad",
  ]);

  const [selectedCommodity, setSelectedCommodity] = useState("Potato");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [prices, setPrices] = useState<any[]>([]);
  const [spread, setSpread] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);

    Promise.all([
      fetchMandiPrices({
        commodity: selectedCommodity,
        district: selectedDistrict,
        limit: 30,
      }),
      fetchMandiSpread(selectedCommodity),
      fetchMandiTrends(selectedCommodity, selectedDistrict === "All" ? "Purba Bardhaman" : selectedDistrict),
    ])
      .then(([priceRes, spreadRes, trendRes]) => {
        if (priceRes && priceRes.prices) setPrices(priceRes.prices);
        if (spreadRes && spreadRes.markets) setSpread(spreadRes.markets);
        if (trendRes && trendRes.timeline) setTrendData(trendRes.timeline);
      })
      .catch((err) => console.error("Error loading mandi data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMandiCommodities()
      .then((res) => {
        if (res.commodities && res.commodities.length > 0) setCommodities(res.commodities);
      })
      .catch(() => {});

    fetchSupportedDistricts()
      .then((res) => {
        if (res.districts) setDistricts(["All", ...res.districts]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCommodity, selectedDistrict]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-5">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">Mandi Price Intelligence</h1>
              <p className="text-xs text-stone-500">
                Verified daily APMC market prices and arrival volumes from Agmarknet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="p-2.5 rounded-2xl border border-stone-300 text-xs font-bold bg-white text-stone-800 focus:ring-2 focus:ring-violet-500"
            >
              {commodities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="p-2.5 rounded-2xl border border-stone-300 text-xs font-bold bg-white text-stone-800 focus:ring-2 focus:ring-violet-500"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Mandi Comparative Price Spread */}
        {spread.length > 0 && (
          <div className="mb-5 bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Mandi Price Spread for {selectedCommodity}
              </h2>
              <span className="text-[10px] text-stone-400">Unit: ₹ / Quintal (100 kg)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {spread.slice(0, 4).map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-violet-300 transition"
                >
                  <span className="text-[11px] font-bold text-stone-700 block truncate">
                    {m.market}
                  </span>
                  <span className="text-[10px] text-stone-400 block truncate mb-1">
                    {m.district}
                  </span>
                  <div className="text-base font-black text-stone-900">
                    ₹{m.modal_price}
                  </div>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Arrivals: {m.arrivals_volume} Qtl
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-Day Trend Chart */}
        {trendData.length > 0 && (
          <div className="mb-5 bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
              <span>7-Day Modal Price Trajectory</span>
            </h2>

            <div className="flex items-end gap-2 h-32 pt-4 px-2">
              {trendData.map((t, idx) => {
                const maxP = Math.max(...trendData.map((d) => d.avg_modal_price));
                const minP = Math.min(...trendData.map((d) => d.avg_modal_price));
                const heightPct = maxP === minP ? 50 : Math.max(20, ((t.avg_modal_price - minP) / (maxP - minP)) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[9px] font-bold text-stone-700 opacity-80 group-hover:opacity-100">
                      ₹{t.avg_modal_price}
                    </span>
                    <div
                      className="w-full bg-violet-500/80 rounded-t-lg transition-all group-hover:bg-violet-600"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-stone-400">{t.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Table */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">Reported Wholesale Transactions</h2>
            <span className="text-[11px] text-stone-400">{prices.length} records found</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 text-[10px] uppercase font-bold tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Market / Mandi</th>
                  <th className="py-3 px-4">Commodity / Variety</th>
                  <th className="py-3 px-4 text-right">Min (₹)</th>
                  <th className="py-3 px-4 text-right">Modal (₹)</th>
                  <th className="py-3 px-4 text-right">Max (₹)</th>
                  <th className="py-3 px-4 text-right">Arrivals (Qtl)</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {prices.map((p, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block">{p.market}</span>
                      <span className="text-[10px] text-stone-400">{p.district}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-stone-800 font-semibold">{p.commodity}</span>
                      <span className="text-[10px] text-stone-400 block">{p.variety || "Standard"}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-stone-600">₹{p.min_price}</td>
                    <td className="py-3 px-4 text-right font-black text-stone-900">₹{p.modal_price}</td>
                    <td className="py-3 px-4 text-right text-stone-600">₹{p.max_price}</td>
                    <td className="py-3 px-4 text-right text-stone-600">{p.arrivals_volume_quintals}</td>
                    <td className="py-3 px-4 text-right text-stone-400">{p.arrival_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-4 rounded-2xl bg-stone-100 text-stone-500 text-xs leading-relaxed">
          <strong>Market Disclaimer:</strong> Mandi prices reflect past reported wholesale spot auctions at licensed APMC yards. They do not constitute forward contracts or guaranteed future purchase commitments.
        </div>
      </main>

      <Navigation />
    </div>
  );
};
