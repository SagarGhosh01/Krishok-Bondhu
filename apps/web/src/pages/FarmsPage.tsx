import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Sprout, MapPin, Layers, Trash2 } from "lucide-react";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { fetchFarms, createFarm } from "../services/api";

export const FarmsPage: React.FC = () => {
  const { t } = useTranslation();
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [plotName, setPlotName] = useState<string>("");
  const [cropType, setCropType] = useState<string>("Tomato");
  const [areaAcres, setAreaAcres] = useState<string>("2.0");
  const [soilType, setSoilType] = useState<string>("Loamy Soil");

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      const data = await fetchFarms();
      setFarms(data);
    } catch (err) {
      console.warn("Could not fetch farms:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotName) return;

    try {
      await createFarm({
        name: plotName,
        crops_grown: cropType,
        area_acres: parseFloat(areaAcres) || 1.0,
      });
      setShowAddModal(false);
      setPlotName("");
      loadFarms();
    } catch (err) {
      alert("Failed to create farm plot.");
    }
  };

  return (
    <div className="min-h-screen bg-agri-bg pb-28 max-w-md mx-auto relative font-sans flex flex-col">
      <Header />

      <main className="px-4 space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-agri-text">
            {t("farms.title")}
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-agri-primary text-white text-xs font-bold px-3 py-2 rounded-2xl flex items-center gap-1.5 shadow-xs hover:bg-agri-primaryHover transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("farms.add_farm")}</span>
          </button>
        </div>

        {/* Farm Cards */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-agri-muted">
              Loading farm plots...
            </div>
          ) : farms.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-agri-border text-center space-y-3 shadow-xs">
              <Sprout className="w-10 h-10 text-agri-primary/40 mx-auto" />
              <p className="text-xs text-agri-muted leading-relaxed">
                {t("farms.no_farms")}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="py-2.5 px-4 bg-agri-surface text-agri-primary text-xs font-bold rounded-2xl border border-agri-border hover:bg-white transition"
              >
                Create First Plot
              </button>
            </div>
          ) : (
            farms.map((farm) => (
              <div
                key={farm.id}
                className="bg-white rounded-3xl p-5 border border-agri-border shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-agri-text">{farm.name}</h4>
                    <span className="text-xs font-semibold text-agri-primary flex items-center gap-1 mt-0.5">
                      <Sprout className="w-3.5 h-3.5" /> {farm.crops_grown || "Mixed Crops"}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-agri-muted bg-agri-surface px-2.5 py-1 rounded-full border border-agri-border">
                    {farm.area_acres ? `${farm.area_acres} Acres` : "1 Plot"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-stone-100">
                  <div className="bg-agri-surface p-2 rounded-xl">
                    <span className="text-agri-muted block">Soil Classification</span>
                    <span className="font-semibold text-agri-text">{farm.soil_type || "Fertile Alluvial"}</span>
                  </div>
                  <div className="bg-agri-surface p-2 rounded-xl">
                    <span className="text-agri-muted block">Created</span>
                    <span className="font-semibold text-agri-text">
                      {new Date(farm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add Plot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-agri-border"
          >
            <h4 className="text-sm font-bold text-agri-text">{t("farms.add_farm")}</h4>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-agri-text block">{t("farms.plot_name")}</label>
              <input
                type="text"
                required
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                placeholder="e.g. North Tomato Field"
                className="w-full text-xs p-3 rounded-xl border border-agri-border focus:outline-hidden focus:border-agri-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-agri-text block">{t("farms.crops")}</label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-agri-border focus:outline-hidden focus:border-agri-primary bg-white"
              >
                <option value="Tomato">Tomato</option>
                <option value="Potato">Potato</option>
                <option value="Corn">Corn (Maize)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-agri-text block">{t("farms.area")}</label>
              <input
                type="number"
                step="0.1"
                value={areaAcres}
                onChange={(e) => setAreaAcres(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-agri-border focus:outline-hidden focus:border-agri-primary"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-agri-border text-xs font-semibold text-agri-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-agri-primary text-white text-xs font-bold shadow-xs hover:bg-agri-primaryHover"
              >
                Save Plot
              </button>
            </div>
          </form>
        </div>
      )}

      <Navigation />
    </div>
  );
};
