import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { fetchDiseases } from "../services/api";

export const LibraryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [diseases, setDiseases] = useState<any[]>([]);
  const [activeCrop, setActiveCrop] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const lang = i18n.language || "en";
        const data = await fetchDiseases(activeCrop, searchQuery, lang);
        setDiseases(data);
      } catch (err) {
        console.error("Failed to fetch diseases:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeCrop, searchQuery, i18n.language]);

  return (
    <div className="min-h-screen bg-agri-bg pb-28 max-w-md mx-auto relative font-sans flex flex-col">
      <Header />

      <main className="px-4 space-y-4 flex-1">
        {/* Title & Search */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-agri-text">
            {t("library.title")}
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-agri-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("library.search_placeholder")}
              className="w-full bg-white border border-agri-border rounded-2xl py-2.5 pl-10 pr-4 text-xs text-agri-text focus:outline-hidden focus:border-agri-primary shadow-xs"
            />
          </div>
        </div>

        {/* Crop Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: t("library.all") },
            { id: "Tomato", label: t("library.tomato") },
            { id: "Potato", label: t("library.potato") },
            { id: "Corn", label: t("library.corn") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCrop(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
                activeCrop === tab.id
                  ? "bg-agri-primary text-white shadow-xs"
                  : "bg-white text-agri-text border border-agri-border hover:bg-agri-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Disease Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-agri-muted">
              Loading verified agronomy guidelines...
            </div>
          ) : diseases.length === 0 ? (
            <div className="py-12 text-center text-xs text-agri-muted">
              No diseases found matching your search.
            </div>
          ) : (
            diseases.map((d) => {
              const trans = d.translations?.[0] || {};
              const adv = d.advisories?.[0] || {};

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-agri-primary bg-agri-surface px-2 py-0.5 rounded-full border border-agri-border">
                        {d.crop}
                      </span>
                      <h4 className="text-sm font-bold text-agri-text mt-1">
                        {trans.display_name || d.class_key.replace(/___/g, " - ").replace(/_/g, " ")}
                      </h4>
                      <p className="text-[11px] text-agri-muted italic">
                        {d.scientific_name}
                      </p>
                    </div>
                    {d.is_healthy ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                        Healthy Leaf
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                        {d.pathogen_type}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-agri-muted leading-relaxed">
                    {trans.description}
                  </p>

                  {/* Bullet points for Symptoms and Cultural Sanitation */}
                  <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                    <div>
                      <strong className="text-agri-text font-semibold block">{t("library.symptoms")}:</strong>
                      <span className="text-agri-muted">{trans.symptoms}</span>
                    </div>
                    <div>
                      <strong className="text-agri-text font-semibold block">{t("library.cultural")}:</strong>
                      <span className="text-agri-muted">{adv.cultural_practices}</span>
                    </div>
                    <div>
                      <strong className="text-agri-text font-semibold block">{t("library.chemical")}:</strong>
                      <span className="text-agri-muted">{adv.chemical_reference}</span>
                    </div>
                  </div>

                  {adv.source_url && (
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-agri-muted">
                      <span>Reviewed: {adv.source_title}</span>
                      <a
                        href={adv.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-agri-primary font-bold flex items-center gap-0.5 hover:underline"
                      >
                        ICAR Source <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      <Navigation />
    </div>
  );
};
