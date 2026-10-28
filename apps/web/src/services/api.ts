/**
 * AgriShield AI - API Client Service
 */

const API_BASE = "/api/v1";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("agrishield_token");
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("agrishield_token", token);
  }
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem("agrishield_token");
  }
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkSystemHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function loginUser(email: string, pass: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function registerUser(email: string, pass: string, name: string, lang = "en") {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass, full_name: name, preferred_language: lang }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function submitPrediction(formData: FormData) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Prediction request failed");
  }
  return res.json();
}

export async function fetchScanResult(scanId: string, lang = "en") {
  const res = await fetch(`${API_BASE}/predict/scans/${scanId}?language=${lang}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchUserScans(page = 1, size = 20, crop?: string) {
  let url = `${API_BASE}/scans?page=${page}&size=${size}`;
  if (crop) url += `&crop=${encodeURIComponent(crop)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) return { items: [], total: 0 };
  return res.json();
}

export async function fetchFarms() {
  const res = await fetch(`${API_BASE}/farms`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function createFarm(data: { name: string; crops_grown?: string; area_acres?: number }) {
  const res = await fetch(`${API_BASE}/farms`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create farm");
  return res.json();
}

export async function fetchDiseases(crop?: string, q?: string, lang = "en") {
  let url = `${API_BASE}/diseases?language=${lang}`;
  if (crop && crop !== "all") url += `&crop=${encodeURIComponent(crop)}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function submitSyncBatch(items: any[]) {
  const res = await fetch(`${API_BASE}/sync`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Sync failed");
  return res.json();
}

export async function submitFeedback(predictionId: string, correct: boolean, suggested?: string, comments?: string) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      prediction_id: predictionId,
      reported_correct: correct,
      suggested_class: suggested,
      comments: comments,
    }),
  });
  return res.json();
}

// --- FULL PLATFORM MODULE API METHODS ---

export async function predictYield(payload: {
  state?: string;
  district: string;
  crop: string;
  season: string;
  area_hectares: number;
  rainfall_mm?: number;
  mean_temperature_celsius?: number;
  irrigation_coverage_pct?: number;
}) {
  const res = await fetch(`${API_BASE}/yield/predict`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Yield prediction failed");
  }
  return res.json();
}

export async function fetchHistoricalYield(district?: string, crop?: string, limit = 50) {
  let url = `${API_BASE}/yield/historical?limit=${limit}`;
  if (district) url += `&district=${encodeURIComponent(district)}`;
  if (crop) url += `&crop=${encodeURIComponent(crop)}`;
  const res = await fetch(url);
  if (!res.ok) return { count: 0, records: [] };
  return res.json();
}

export async function fetchSupportedCrops() {
  const res = await fetch(`${API_BASE}/yield/crops`);
  if (!res.ok) return { crops: [] };
  return res.json();
}

export async function fetchSupportedDistricts() {
  const res = await fetch(`${API_BASE}/yield/districts`);
  if (!res.ok) return { state: "West Bengal", districts: [] };
  return res.json();
}

export async function fetchWeatherCurrent(district = "Purba Bardhaman") {
  const res = await fetch(`${API_BASE}/weather/current?district=${encodeURIComponent(district)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchWeatherForecast(district = "Purba Bardhaman") {
  const res = await fetch(`${API_BASE}/weather/forecast?district=${encodeURIComponent(district)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchMandiPrices(params: {
  commodity?: string;
  district?: string;
  market?: string;
  limit?: number;
}) {
  let url = `${API_BASE}/mandi/prices?limit=${params.limit || 50}`;
  if (params.commodity && params.commodity !== "All") url += `&commodity=${encodeURIComponent(params.commodity)}`;
  if (params.district && params.district !== "All") url += `&district=${encodeURIComponent(params.district)}`;
  if (params.market) url += `&market=${encodeURIComponent(params.market)}`;
  const res = await fetch(url);
  if (!res.ok) return { count: 0, prices: [] };
  return res.json();
}

export async function fetchMandiTrends(commodity = "Potato", district = "Purba Bardhaman") {
  const res = await fetch(`${API_BASE}/mandi/trends?commodity=${encodeURIComponent(commodity)}&district=${encodeURIComponent(district)}`);
  if (!res.ok) return { timeline: [] };
  return res.json();
}

export async function fetchMandiSpread(commodity = "Potato") {
  const res = await fetch(`${API_BASE}/mandi/spread?commodity=${encodeURIComponent(commodity)}`);
  if (!res.ok) return { markets: [] };
  return res.json();
}

export async function fetchMandiCommodities() {
  const res = await fetch(`${API_BASE}/mandi/commodities`);
  if (!res.ok) return { commodities: ["Potato", "Tomato", "Rice", "Maize", "Mustard", "Jute"] };
  return res.json();
}

export async function analyzeSoil(payload: {
  ph: number;
  electrical_conductivity: number;
  organic_carbon_pct: number;
  available_nitrogen: number;
  available_phosphorus: number;
  available_potassium: number;
  farm_id?: string;
}) {
  const res = await fetch(`${API_BASE}/soil/analyze`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Soil analysis request failed");
  }
  return res.json();
}

export async function fetchSoilBenchmarks() {
  const res = await fetch(`${API_BASE}/soil/benchmarks`);
  if (!res.ok) return { parameters: [] };
  return res.json();
}

export async function fetchGovernmentSchemes(category?: string, search?: string, lang = "en") {
  let url = `${API_BASE}/schemes?language=${lang}`;
  if (category && category !== "All") url += `&category=${encodeURIComponent(category)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await fetch(url);
  if (!res.ok) return { count: 0, schemes: [] };
  return res.json();
}

export async function fetchSchemeDetail(id: string, lang = "en") {
  const res = await fetch(`${API_BASE}/schemes/${encodeURIComponent(id)}?language=${lang}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchDataSources() {
  const res = await fetch(`${API_BASE}/sources`);
  if (!res.ok) return { count: 0, registry: [] };
  return res.json();
}

export async function fetchFarmerReport(district = "Purba Bardhaman", crop = "Potato") {
  const res = await fetch(`${API_BASE}/reports/farmer-summary?district=${encodeURIComponent(district)}&crop=${encodeURIComponent(crop)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}
