/**
 * AgriShield AI - API Client Service
 */

const API_BASE = "/api/v1";

export function getAuthToken(): string | null {
  return localStorage.getItem("agrishield_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("agrishield_token", token);
}

export function removeAuthToken(): void {
  localStorage.removeItem("agrishield_token");
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
