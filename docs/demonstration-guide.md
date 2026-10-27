# AgriShield AI: End-to-End Demonstration & Testing Guide

This guide provides a reproducible walkthrough for evaluators, researchers, extension officers, and developers to verify all 6 decision-support modules and 11 interface pages of **AgriShield AI**.

---

## 1. Quick Local Demonstration Setup

### Step 1: Start Backend API (FastAPI)
```bash
# In workspace root (e:\AgriShield AI)
python -m uvicorn services.api.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Service Health Endpoint: `http://127.0.0.1:8000/health`

### Step 2: Start Mobile-First PWA (React + Vite)
```bash
# In apps/web
cd apps/web
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 2. Walkthrough of the 11 Core Pages & Decision Journeys

### Journey 1: Landing Page (`/`)
1. Open `http://localhost:5173/`.
2. Notice the platform mission: *"Smarter Farming. Safer Crops. Better Decisions."*
3. Verify the official data source badges (UPAg, data.gov.in, IMD, Agmarknet, Soil Health Card Portal).
4. Review the honest agricultural disclaimer prominently stating that AgriShield AI is a screening aid that does not replace certified agronomists or official warnings.
5. Click **"Check My Crop Now"** or **"Open Farmer Dashboard"**.

### Journey 2: Farmer Onboarding (`/onboarding`)
1. **Language Selection**: Choose between English, বাংলা (Bengali), and हिंदी (Hindi).
2. **Location & Crop Selection**: Select your district (e.g., *Purba Bardhaman*) and crops grown (e.g., *Potato, Tomato, Rice*).
3. Read the transparent **"Why we ask"** tooltip explaining that district data drives localized mandi prices and weather risk alerts.
4. **Farm Details**: Enter land size (e.g. 1.5 acres) and irrigation source or click *"Skip Non-Essential Questions"*.
5. Click **"Save & Enter Dashboard"**.

### Journey 3: Farmer Dashboard (`/dashboard`)
1. Observe the **Live Micro-Climate Banner** displaying real-time temperature, humidity, and favorable spray windows for Purba Bardhaman.
2. Inspect the **Mandi Wholesale Ticker** displaying today's modal prices for Potato (₹1,550/Qtl), Tomato, and Rice.
3. Access the **6 Decision Shortcuts** (Scan Leaf, Yield Forecast, Mandi Prices, Agro-Risk, Soil Health, Govt Schemes).
4. View recent screening records with calibrated confidence ratings and diagnostic states.

### Journey 4: Crop Disease Detection (`/recognize` & `/result`)
1. Navigate to `/recognize`.
2. Upload a test leaf image from `ml/data/sample_dataset/Tomato___Target_Spot/leaf_000.jpg` or use one of the pre-loaded sample leaf pills.
3. Notice the automated quality check validating that the image is not blurry and possesses adequate illumination.
4. Review the result screen (`/result`):
   - **Calibrated Prediction**: Disease identification with calibrated confidence score.
   - **Diagnostic State Badge**: Clear label (*Confident*, *Moderate*, or *Uncertain*).
   - **Grad-CAM Saliency Overlay**: Toggle the heatmap overlay to visualize infected leaf regions.
   - **Verified Agronomic Advisory**: Cultural and biological prevention steps curated from ICAR extension standards; chemical recommendations strictly advise consulting local Krishi Prajukti Sahayak (KPS) officers without hallucinated dosages.
   - **Expert Escalation**: One-tap access to Kisan Call Centre (Toll-Free 1800-180-1551).

### Journey 5: Empirical Yield Forecasting (`/yield`)
1. Select District: *Purba Bardhaman*.
2. Select Crop: *Potato*, Season: *Rabi*, Area: *2.5 Hectares*.
3. Click **"Forecast Expected Yield"**.
4. Observe the empirical forecast:
   - Predicted Yield: ~25.8 t/ha (Total: ~64.5 Metric Tonnes).
   - 80% Prediction Interval reflecting seasonal variance.
   - Variance against the 5-year district historical benchmark.
   - Transparent list of agronomic limitations (extreme weather, localized pests).

### Journey 6: Weather & Agro-Risk Intelligence (`/weather`)
1. Select District: *Hooghly* or *Purba Bardhaman*.
2. Review current satellite and ground station observation stream.
3. Inspect the **Wallin's Late Blight Severity Values (BSV)** risk gauge (Low, Moderate, High risk) on Potato and Tomato.
4. Check 5-day agro-meteorological forecast (temperatures, precipitation accumulation, and rain probability).

### Journey 7: Mandi Price Explorer (`/mandi`)
1. Select Commodity: *Potato* or *Tomato*.
2. Review the **Multi-Mandi Comparative Spread**: Compares spot rates in Memari (₹1,580), Kalna (₹1,820), Sheoraphuli (₹1,620), and Burdwan (₹1,550).
3. View the **7-Day Modal Price Trajectory** chart.
4. Filter by district or browse detailed APMC auction records.

### Journey 8: Soil Health & Nutrient Planning (`/soil`)
1. Enter soil parameters: $\text{pH} = 6.2$, $\text{EC} = 0.45\text{ dS/m}$, $\text{OC} = 0.65\%$, $\text{N} = 310\text{ kg/ha}$, $\text{P} = 18.5\text{ kg/ha}$, $\text{K} = 180\text{ kg/ha}$.
2. Click **"Analyze Soil Report"**.
3. View the composite **Fertility Index Score** (e.g., 82/100).
4. Review parameter ratings according to official Soil Health Card guidelines.
5. Review tailored soil amendment guidance (e.g. agricultural lime for acidic soil, FYM addition).
6. Inspect the **Crop Suitability Index** showing compatibility scores for Potato (95%), Tomato (88%), and Rice (84%).

### Journey 9: Government Schemes Discovery (`/schemes`)
1. Search schemes by keyword or filter by categories: *Income Support*, *Crop Insurance*, *Credit*, *Organic Farming*.
2. Click on **Bangla Shasya Bima (BSB)** or **Krishak Bandhu (Natun)** to expand.
3. Review verified eligibility checklists and required documentation.
4. Click *"Apply on Official Portal"* to inspect direct official links to `.gov.in` sites.
5. Read the anti-fraud advisory warning farmers against fraudulent intermediaries.

### Journey 10: Farmer Assessment Dossier (`/reports`)
1. Select district and primary crop.
2. View the generated unified dossier synthesizing weather status, yield projection, mandi rates, and scan history.
3. Click **"Print / PDF"** to produce a clean, printable assessment report.

### Journey 11: Settings & Privacy (`/settings`)
1. Switch interface language between English, Bengali, and Hindi.
2. Test the **"Export All Farm Data (JSON)"** feature to download a complete local backup.
3. Verify the **"Purge Local Data & Cache"** feature to ensure farmer data sovereignty and privacy.

---

## 3. Automated Test Verification Commands

Run the full automated test suite verifying both backend services and frontend components:

```bash
# 1. Backend Pytest Suite (34 tests covering ML, API, Auth, Yield, Weather, Mandi, Soil, Schemes)
python -m pytest ml/tests services/api/tests -v

# 2. Frontend Vitest Suite (10 tests covering UI components, API services, i18n)
cd apps/web && npm test

# 3. Frontend Production Build Check
npm run build
```
