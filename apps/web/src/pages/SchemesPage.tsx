import React, { useState, useEffect } from "react";
import {
  Landmark,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { fetchGovernmentSchemes } from "../services/api";

export const SchemesPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [schemes, setSchemes] = useState<any[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>("BSB_WB");

  const categories = [
    "All",
    "Income Support",
    "Crop Insurance",
    "Credit",
    "Soil & Inputs",
    "Organic Farming",
    "Subsidies & Machinery",
  ];

  const loadSchemes = () => {
    setLoading(true);
    fetchGovernmentSchemes(category, search, i18n.language)
      .then((data) => {
        if (data.schemes) setSchemes(data.schemes);
      })
      .catch((err) => console.error("Error loading schemes:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchemes();
  }, [category, search, i18n.language]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-900">Government Schemes Discovery</h1>
            <p className="text-xs text-stone-500">
              Verified Central and West Bengal agricultural welfare schemes, eligibility checklists, and official portals.
            </p>
          </div>
        </div>

        {/* Search Bar & Category Filter Pills */}
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scheme name (e.g. Bangla Shasya Bima, PM-KISAN, KCC)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                  category === c
                    ? "bg-rose-700 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-5 p-4 rounded-3xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>Security & Fraud Alert:</strong> AgriShield AI provides verified public information from official government portals. AgriShield AI never charges application fees and never collects Aadhaar numbers or banking passwords. Always apply directly on verified <code className="bg-amber-100 px-1 rounded">.gov.in</code> websites.
          </p>
        </div>

        {/* Schemes List */}
        {loading && (
          <div className="p-12 text-center text-xs text-stone-400">Loading government schemes directory...</div>
        )}

        <div className="space-y-3.5">
          {schemes.map((s) => {
            const isExpanded = expandedId === s.id;
            return (
              <div
                key={s.id}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden transition"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="p-5 cursor-pointer flex items-start justify-between gap-3 hover:bg-stone-50/60"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {s.category}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">
                        Verified: {s.last_verified_date}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-stone-900">{s.title}</h2>
                    <p className="text-xs text-stone-500 mt-0.5 font-medium">{s.sponsoring_agency}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={s.official_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 transition"
                      title="Open Official Website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <div className={`p-1 text-stone-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-stone-100 text-xs text-stone-700 space-y-4 animate-in fade-in">
                    {/* Financial aid */}
                    {s.benefits_summary && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                        <span className="font-bold text-[11px] block uppercase text-emerald-800 tracking-wider mb-1">
                          Key Benefits
                        </span>
                        <p className="leading-relaxed">{s.benefits_summary.financial_aid}</p>
                      </div>
                    )}

                    {/* Eligibility Checklist */}
                    <div>
                      <span className="font-bold text-xs text-stone-900 block mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Eligibility Criteria</span>
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {s.eligibility_criteria?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-stone-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Required Documents Checklist */}
                    <div>
                      <span className="font-bold text-xs text-stone-900 block mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Required Documents</span>
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {s.documents_required?.map((doc: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0 mt-1.5"></span>
                            <span className="text-stone-600">{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <a
                        href={s.official_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition"
                      >
                        <span>Apply on Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <Navigation />
    </div>
  );
};
