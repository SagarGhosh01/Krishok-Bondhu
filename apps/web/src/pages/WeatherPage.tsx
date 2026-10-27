import React, { useState, useEffect } from "react";
import {
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Info,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header";
import { Navigation } from "../components/Navigation";
import { fetchWeatherForecast, fetchSupportedDistricts } from "../services/api";

export const WeatherPage: React.FC = () => {
  const { t } = useTranslation();

  const [districts, setDistricts] = useState<string[]>([
    "Purba Bardhaman",
    "Hooghly",
    "Nadia",
    "Murshidabad",
    "Bankura",
    "Birbhum",
    "Malda",
    "Jalpaiguri",
  ]);
  const [selectedDistrict, setSelectedDistrict] = useState("Purba Bardhaman");
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWeather = (dist: string) => {
    setLoading(true);
    fetchWeatherForecast(dist)
      .then((data) => {
        if (data) setWeatherData(data);
      })
      .catch((err) => console.error("Error loading weather:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSupportedDistricts()
      .then((res) => {
        if (res.districts && res.districts.length > 0) {
          setDistricts(res.districts);
        }
      })
      .catch(() => {});

    loadWeather(selectedDistrict);
  }, []);

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    loadWeather(dist);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-28">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-5">
        {/* Title Bar & District Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">Weather & Agro-Risk</h1>
              <p className="text-xs text-stone-500">Live observation, 5-day forecast, and Wallin BSV disease risk models.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="p-2.5 rounded-2xl border border-stone-300 text-xs font-bold bg-white text-stone-800 focus:ring-2 focus:ring-agri-primary"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadWeather(selectedDistrict)}
              className="p-2.5 rounded-2xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              title="Refresh Weather"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading && !weatherData && (
          <div className="p-12 text-center text-xs text-stone-400">Loading live weather data...</div>
        )}

        {weatherData && (
          <div className="space-y-5 animate-in fade-in">
            {/* Current Conditions Card */}
            <div className="bg-gradient-to-br from-emerald-800 to-stone-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  {weatherData.district} &bull; {weatherData.current?.condition}
                </span>
                <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {weatherData.is_live ? "Live Satellite & Station Stream" : "Cached Climatology"}
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-5xl font-black tracking-tight">
                  {Math.round(weatherData.current?.temperature_celsius)}°C
                </span>
                <span className="text-sm font-semibold text-emerald-200">
                  Observed at {weatherData.observation_time?.slice(11, 16) || "12:00"} IST
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-300" />
                  <div>
                    <span className="text-[10px] text-white/60 block">Humidity</span>
                    <span className="font-bold">{weatherData.current?.relative_humidity_pct}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-emerald-300" />
                  <div>
                    <span className="text-[10px] text-white/60 block">Rainfall</span>
                    <span className="font-bold">{weatherData.current?.precipitation_mm} mm</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-emerald-300" />
                  <div>
                    <span className="text-[10px] text-white/60 block">Wind Speed</span>
                    <span className="font-bold">{weatherData.current?.wind_speed_kmh} km/h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agro-Risk Section (Late Blight, Moisture, Waterlogging) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Late Blight Wallin BSV Card */}
              <div className="bg-white rounded-3xl p-4.5 border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-800">Late Blight Risk (BSV)</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      weatherData.agro_risks?.late_blight?.risk_level === "HIGH"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : weatherData.agro_risks?.late_blight?.risk_level === "MODERATE"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {weatherData.agro_risks?.late_blight?.risk_level} RISK
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {weatherData.agro_risks?.late_blight?.advisory}
                </p>
                <span className="text-[9px] text-stone-400 mt-2 block font-medium">
                  Basis: Wallin's Blight Severity Values (Temp &bull; RH hours)
                </span>
              </div>

              {/* Moisture Stress */}
              <div className="bg-white rounded-3xl p-4.5 border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-800">Moisture Stress</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {weatherData.agro_risks?.moisture_stress?.risk_level}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {weatherData.agro_risks?.moisture_stress?.advisory}
                </p>
                <span className="text-[9px] text-stone-400 mt-2 block font-medium">
                  Calculated from 5-day cumulative rainfall projections
                </span>
              </div>

              {/* Waterlogging Risk */}
              <div className="bg-white rounded-3xl p-4.5 border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-800">Waterlogging Risk</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {weatherData.agro_risks?.waterlogging?.risk_level}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {weatherData.agro_risks?.waterlogging?.advisory}
                </p>
                <span className="text-[9px] text-stone-400 mt-2 block font-medium">
                  Trigger threshold: Daily accumulation &gt; 45mm
                </span>
              </div>
            </div>

            {/* 5-Day Agro-Met Forecast */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs">
              <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>5-Day Agro-Meteorological Forecast</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {weatherData.forecast_5_days?.map((day: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 text-center flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-stone-700 block">
                        {idx === 0 ? "Today" : day.date?.slice(5)}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {day.weather_condition}
                      </span>
                    </div>

                    <div className="my-2.5">
                      <span className="text-base font-black text-stone-900">
                        {Math.round(day.temp_max)}°
                      </span>
                      <span className="text-xs text-stone-400 ml-1">
                        /{Math.round(day.temp_min)}°
                      </span>
                    </div>

                    <div className="text-[10px] text-stone-500 font-medium">
                      💧 {day.precipitation_mm}mm ({day.precipitation_probability}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p className="font-semibold">{weatherData.agro_risks?.disclaimer}</p>
            </div>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
};
