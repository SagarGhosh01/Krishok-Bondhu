import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  MapPin,
  Sprout,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";
import { Header } from "../components/Header";

const WEST_BENGAL_DISTRICTS = [
  "Purba Bardhaman",
  "Hooghly",
  "Nadia",
  "Murshidabad",
  "Bankura",
  "Birbhum",
  "Malda",
  "Jalpaiguri",
  "Cooch Behar",
  "North 24 Parganas",
  "South 24 Parganas",
  "Purba Medinipur",
  "Paschim Medinipur",
  "Purulia",
  "Dakshin Dinajpur",
  "Uttar Dinajpur",
];

const CROPS_LIST = [
  { id: "Potato", name: "Potato (আলু / आलू)", tag: "Rabi" },
  { id: "Tomato", name: "Tomato (টমেটো / टमाटर)", tag: "Rabi/Summer" },
  { id: "Rice", name: "Rice / Paddy (ধান / धान)", tag: "Kharif/Boro" },
  { id: "Maize", name: "Corn / Maize (ভুট্টা / मक्का)", tag: "Kharif/Rabi" },
  { id: "Mustard", name: "Mustard (সরিষা / सरसों)", tag: "Rabi" },
  { id: "Jute", name: "Jute (পাট / पटसन)", tag: "Kharif" },
  { id: "Wheat", name: "Wheat (গম / गेहूं)", tag: "Rabi" },
];

export const OnboardingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedLang, setSelectedLang] = useState(i18n.language || "en");
  const [district, setDistrict] = useState("Purba Bardhaman");
  const [selectedCrops, setSelectedCrops] = useState<string[]>(["Potato", "Tomato"]);
  const [farmSize, setFarmSize] = useState("1.5");
  const [irrigation, setIrrigation] = useState("Canal / Tubewell");

  const handleLanguageSelect = (lang: string) => {
    setSelectedLang(lang);
    changeLanguage(lang);
  };

  const toggleCrop = (cropId: string) => {
    if (selectedCrops.includes(cropId)) {
      setSelectedCrops(selectedCrops.filter((c) => c !== cropId));
    } else {
      setSelectedCrops([...selectedCrops, cropId]);
    }
  };

  const handleFinish = () => {
    const profile = {
      language: selectedLang,
      state: "West Bengal",
      district,
      crops: selectedCrops,
      farmSizeAcres: parseFloat(farmSize) || 1.0,
      irrigationType: irrigation,
      onboardingCompleted: true,
    };
    localStorage.setItem("agrishield_farmer_profile", JSON.stringify(profile));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-16">
      <Header />

      <main className="max-w-xl mx-auto px-4 pt-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
            <span>Step {step} of 3</span>
            <span>
              {step === 1 ? "Language" : step === 2 ? "Location & Crops" : "Farm Profile (Optional)"}
            </span>
          </div>
          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-agri-primary h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Language */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-agri-primary border border-emerald-200 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-stone-900">Choose Your Preferred Language</h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              AgriShield AI operates in English, বাংলা (Bengali), and हिंदी (Hindi). You can switch anytime in settings.
            </p>

            <div className="grid grid-cols-1 gap-3 mt-6">
              {[
                { code: "en", label: "English", sub: "Standard English", script: "English" },
                { code: "bn", label: "বাংলা", sub: "Bengali (পশ্চিমবঙ্গ)", script: "বাংলা" },
                { code: "hi", label: "हिंदी", sub: "Hindi (भारत)", script: "देवनागरी" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageSelect(l.code)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition active:scale-98 ${
                    selectedLang === l.code
                      ? "border-agri-primary bg-emerald-50/60 shadow-xs"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div>
                    <span className="font-bold text-base text-stone-900">{l.label}</span>
                    <p className="text-xs text-stone-500">{l.sub}</p>
                  </div>
                  {selectedLang === l.code && (
                    <CheckCircle2 className="w-5 h-5 text-agri-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                No account needed to start
              </span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-2xl bg-agri-primary hover:bg-agri-primaryHover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location & Crops */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-stone-900">Your District & Crops</h2>

            {/* Why we ask banner */}
            <div className="mt-2 p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2 text-xs text-stone-600">
              <HelpCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <span>
                <strong>Why we ask:</strong> We use your district to fetch local APMC mandi prices and calibrated weather risk alerts (e.g. Late Blight alerts in Hooghly / Burdwan).
              </span>
            </div>

            {/* District select */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                District (West Bengal Pilot)
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-3 rounded-2xl border border-stone-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-agri-primary"
              >
                {WEST_BENGAL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Crops selector */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Select Crops You Grow (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CROPS_LIST.map((crop) => {
                  const isChecked = selectedCrops.includes(crop.id);
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => toggleCrop(crop.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between text-xs font-medium transition ${
                        isChecked
                          ? "border-agri-primary bg-emerald-50/60 text-emerald-900 font-bold"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                      }`}
                    >
                      <span>{crop.name}</span>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-agri-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-2xl bg-agri-primary hover:bg-agri-primaryHover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Optional Farm Details */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-4">
              <Sprout className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-stone-900">Farm Details (Optional)</h2>
            <p className="text-xs text-stone-500 mt-1">
              Helps calibrate yield production totals and soil health recommendations. You can skip this step anytime.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Total Cultivated Land (Acres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-stone-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-agri-primary"
                  placeholder="e.g. 1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Primary Irrigation Method
                </label>
                <select
                  value={irrigation}
                  onChange={(e) => setIrrigation(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-stone-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-agri-primary"
                >
                  <option value="Canal / Tubewell">Canal / Shallow Tube-well</option>
                  <option value="River Lift / Pond">River Lift Irrigation / Farm Pond</option>
                  <option value="Drip / Sprinkler">Micro-irrigation (Drip / Sprinkler)</option>
                  <option value="Rainfed">Purely Rainfed (No assured irrigation)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleFinish}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Skip Non-Essential Questions
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-3 rounded-2xl bg-agri-primary hover:bg-agri-primaryHover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Enter Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
