# AgriShield AI: Product Requirements Document (PRD)

**Platform Name:** AgriShield AI  
**Tagline:** *Smarter Farming. Safer Crops. Better Decisions.*  
**Target Market:** India (Pilot: West Bengal; expandable pan-India)  
**Target Audience:** Small and marginal farmers, agricultural extension workers (KPS - Krishi Prajukti Sahayak), Farmer Producer Organizations (FPOs), agronomy students, and agricultural researchers.  
**Languages Supported:** English (`en`), Bengali (`bn`), Hindi (`hi`).  
**Primary Interface:** Mobile-first Responsive Web Application / Progressive Web App (PWA).

---

## 1. Executive Summary & Vision

Smallholder farmers in India face compounding challenges: sudden disease outbreaks, volatile market prices, climate uncertainties, soil degradation, and fragmented access to government welfare schemes. Most available software tools either offer isolated computer vision demos with unrealistic accuracy claims or provide complex dashboards inaccessible to rural users with limited digital literacy.

**AgriShield AI** is an integrated, production-ready agricultural intelligence and decision-support platform designed to answer six fundamental questions for every Indian farmer:
1. *What crop disease might be visible in my leaf photograph?* (Computer Vision + Explainability)
2. *What weather conditions or agricultural risks should I monitor?* (Meteorological Intelligence + Agro-risk Models)
3. *What crop yield might be expected based on historical data and known inputs?* (Empirical Yield Forecasting)
4. *What are recent market prices for my crop at relevant mandis?* (Agmarknet Mandi Intelligence)
5. *Where can I find relevant official agricultural schemes, advisories, and support?* (Government Schemes Directory)
6. *What practical, verified next steps should I consider?* (Evidence-based Guidance & Expert Escalation)

### Core Operational Principles & AI Ethics
1. **Honest Limitations**: The application explicitly disclaims replacing certified agronomists, state agricultural universities (SAUs), laboratory testing, or official IMD weather alerts. High model confidence is never presented as definitive proof.
2. **No Hallucinated Recommendations**: No synthetic pesticide trade names or unverified chemical dosages are generated. Recommendations follow official ICAR and State Agricultural Extension package-of-practices.
3. **Verified Official Data**: Agricultural statistics, mandi records, and weather data are sourced exclusively from documented government portals (UPAg, data.gov.in, Agmarknet, IMD) or reliable meteorological baselines. No fabricated APIs or fake data points.
4. **Privacy & Security**: Zero collection of sensitive personal credentials (no Aadhaar numbers, no bank account details). GPS coordinates are only accessed with explicit user consent.
5. **Offline-First Resilience**: Critical disease inference and advisory lookup operate offline on the farmer's mobile browser via WebAssembly/ONNX Runtime Web, queuing scans for synchronization when internet is available.

---

## 2. User Personas

### Persona A: Ramesh Mondal (Smallholder Potato & Tomato Farmer)
- **Location**: Burdwan (Purba Bardhaman), West Bengal.
- **Land Holding**: 1.5 acres.
- **Crops**: Potato (Rabi), Tomato & Rice (Kharif/Summer).
- **Tech Literacy**: Low to moderate; uses WhatsApp and YouTube on an Android smartphone with intermittent 4G.
- **Primary Need**: Quick identification of leaf browning on potato crops, real-time prices in local mandis (e.g., Memari, Kalna), and simplified guidance on whether late blight fungicide spray is officially recommended.

### Persona B: Ananya Sen (Krishi Prajukti Sahayak / Extension Worker)
- **Location**: Nadia District, West Bengal.
- **Role**: Field extension officer advising 200+ farming families across 4 Gram Panchayats.
- **Tech Literacy**: High; uses tablet/laptop and mobile.
- **Primary Need**: Reliable disease screening with visual heatmaps (Grad-CAM) to educate farmers, historical district yield estimates to plan production targets, and up-to-date scheme criteria (Bangla Shasya Bima, Krishak Bandhu) to assist applications.

### Persona C: Dr. Subhash Roy (Agricultural Researcher / Agronomy Student)
- **Location**: Bidhan Chandra Krishi Viswavidyalaya (BCKV), Mohanpur, West Bengal.
- **Tech Literacy**: Very high; works with Python, GIS, and statistical tools.
- **Primary Need**: Access to verified historical yield datasets, reproducible ML baselines, calibrated uncertainty metrics, and transparent data provenance.

---

## 3. Product Scope & Functional Modules

```
                    ┌──────────────────────────────────────────────┐
                    │               AgriShield AI                  │
                    │       Decision Support Architecture          │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌───────────────┬─────────────────┼────────────────┬───────────────┐
         ▼               ▼                 ▼                ▼               ▼
   [Module A]      [Module B]        [Module C]       [Module D]      [Module E]      [Module F]
  Crop Disease       Yield            Weather &         Mandi           Soil            Govt
 Classification   Forecasting         Agro-Risk      Intelligence      Health         Schemes
 (17 Classes,     (UPAg/DES          (IMD & ERA5,    (Agmarknet        (SHC Specs,    (Central &
  Grad-CAM,        Random Forest/     BSV Model,       Modal Prices,    N-P-K & pH,    State Portals,
  Uncertainty)     Gradient Boost)    Alerts)          Trends)          Suitability)   Eligibility)
```

### Module A: Crop Disease Screening & Advisory
- **Inputs**: User camera capture or leaf image upload (JPEG/PNG/WebP, max 10MB).
- **Supported Crops (17 classes)**:
  - *Tomato*: Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Yellow Leaf Curl Virus, Mosaic Virus, Healthy.
  - *Potato*: Early Blight, Late Blight, Healthy.
  - *Corn / Maize*: Cercospora Leaf Spot (Gray Leaf Spot), Common Rust, Northern Leaf Blight, Healthy.
- **Safety Gate**: Image quality check (blur detection via Laplacian variance, exposure verification).
- **Inference Engine**: Dual capability (Client-side ONNX Runtime Web worker + Server-side PyTorch with Temperature Scaling).
- **Outputs**:
  - Predicted disease / condition.
  - Calibrated confidence score with 3 explicit states:
    - *High Confidence (> 75%)*: Actionable advisory displayed.
    - *Moderate Confidence (50% - 75%)*: Primary & secondary candidates shown.
    - *Uncertain (< 50%)*: Explicit "Uncertain diagnosis" warning; prompt to retake photo or consult extension worker.
  - Grad-CAM saliency overlay highlighting infected leaf regions.
  - Organic and cultural management practices verified by ICAR/SAU.
  - One-tap escalation to local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (Toll-Free 1800-180-1551).

### Module B: Empirical Crop Yield Forecasting
- **Inputs**: State, District (West Bengal pilot + major states), Crop (Rice, Potato, Maize, Tomato, Wheat, Jute), Season (Kharif, Rabi, Summer, Whole Year), Cultivated Area (Hectares), Irrigation Status, Historical Rainfall/Temperature context.
- **Modeling Framework**:
  - Historical baseline (5-year rolling mean).
  - Linear / Ridge Regression.
  - Random Forest Regressor & Gradient Boosting Regressor trained on official UPAg / Ministry of Agriculture district-level statistics (2000–2022).
- **Evaluation & Validation**: Temporal split (train on prior years, evaluate on 2018–2022 holdout) reporting MAE, RMSE, and $R^2$.
- **Outputs**:
  - Estimated yield in tonnes/hectare and total estimated production in tonnes.
  - Comparison against district 5-year historical average.
  - 80% prediction interval reflecting climate variability.
  - Transparent statement of model limitations (weather shocks, pest outbreaks cannot be foreseen by historical trend models alone).

### Module C: Weather Intelligence & Agro-Meteorological Risk
- **Data Source**: India Meteorological Department (IMD) open standards and Open-Meteo high-resolution meteorological models.
- **Features**:
  - 5-day agro-meteorological forecast (temperature, relative humidity, precipitation, wind speed).
  - Rainfall anomaly calculation against normal seasonal baselines.
  - Official IMD weather warnings and alerts (Yellow, Orange, Red alerts).
  - Rule-based Epidemiological Risk Indicators:
    - *Late Blight Risk*: Wallin's Blight Severity Values (BSV) based on consecutive hours of RH > 90% and temperatures between 7°C–25°C.
    - *Moisture Stress / Drought Risk*: < 5mm rainfall over 14 consecutive days during vegetative stages.
    - *Waterlogging & Root Rot Risk*: Daily precipitation > 50mm.

### Module D: Mandi Price Intelligence
- **Data Source**: Agmarknet (Agricultural Marketing Information Network, Ministry of Agriculture).
- **Features**:
  - Real-time and historical wholesale prices across West Bengal and pan-India mandis.
  - Filterable by State, District, Mandi, Commodity, and Date Range.
  - Displays Min Price, Max Price, and Modal Price (₹ per Quintal).
  - Daily arrival volumes (Quintals / Tonnes).
  - Multi-mandi comparative price spread to help farmers decide where to sell.
  - Explicit disclaimer: Prices reflect past and current reported transactions, not guaranteed future contracts.

### Module E: Soil Health & Crop Planning
- **Standard**: Government of India Soil Health Card (DAC&FW) parameters and benchmark ratings.
- **Inputs**:
  - Soil pH, Electrical Conductivity (EC, dS/m), Organic Carbon (OC, %).
  - Primary Nutrients: Available Nitrogen (N, kg/ha), Available Phosphorus (P, kg/ha), Available Potassium (K, kg/ha).
  - Secondary/Micro nutrients (optional): Zinc, Iron, Boron, Sulphur.
- **Validation**: Strict boundary checks (e.g., pH between 3.0 and 11.0, OC between 0.01% and 5.0%).
- **Outputs**:
  - Soil fertility rating (Low, Medium, High) for each parameter based on official Indian standards.
  - Corrective soil amendments (e.g., agricultural lime for acidic soils in North Bengal, gypsum for sodic soils, organic manure for low OC).
  - Crop suitability index for pilot crops based on soil pH and nutrient preferences.

### Module F: Government Scheme Discovery
- **Scope**: Verified Central and West Bengal State agricultural schemes:
  - *PM-KISAN* (Pradhan Mantri Kisan Samman Nidhi)
  - *PMFBY* (Pradhan Mantri Fasal Bima Yojana)
  - *Bangla Shasya Bima* (BSB - West Bengal fully subsidized crop insurance)
  - *Krishak Bandhu* (West Bengal direct farmer income and life insurance)
  - *Kisan Credit Card* (KCC)
  - *Soil Health Card Scheme*
  - *PKVY* (Paramparagat Krishi Vikas Yojana)
  - *SMAM* (Sub-Mission on Agricultural Mechanization)
- **Features**:
  - Multilingual search and category filtering (Income Support, Insurance, Credit, Subsidies, Organic Farming).
  - Official portal URLs, responsible departments, verified eligibility criteria, required documentation checklists.
  - Clear fraud warnings: AgriShield AI never charges fees or collects bank/Aadhaar information.

---

## 4. User Journey & Navigation (11 Pages)

| Page # | Page Route | Screen Name | Key Farmer Action & Content |
| :---: | :--- | :--- | :--- |
| **1** | `/` | **Landing Page** | Platform value proposition, feature summary, official data provenance badges, quick "Check My Crop" CTA. |
| **2** | `/onboarding` | **Farmer Onboarding** | Language selection (EN, BN, HI), District selection (West Bengal pilot + India), Crops grown, Farm size. Rationale explained for every input. |
| **3** | `/dashboard` | **Farmer Dashboard** | Live weather summary, local mandi ticker, recent disease scans, quick agro-advisories, data freshness monitor. |
| **4** | `/disease` | **Disease Detection** | Camera/file upload, quality gate validation, progress animation, prediction with calibrated confidence, Grad-CAM heatmap, agronomic guidance, KVK escalation. |
| **5** | `/yield` | **Yield Forecasting** | Crop, district, season, area inputs; empirical yield prediction (t/ha), historical district comparison, 80% confidence interval, model limitations. |
| **6** | `/weather` | **Weather & Risk** | 5-day forecast, rainfall totals, official IMD alerts, late blight and moisture stress risk meters. |
| **7** | `/mandi` | **Mandi Explorer** | Commodity and district selector, modal price tables, price trends, arrival volumes, mandi spread comparison. |
| **8** | `/soil` | **Soil Health & Planning**| Soil test entry form, automated classification (Acidic/Alkaline, N-P-K status), recommended organic/mineral amendments, crop suitability. |
| **9** | `/schemes` | **Govt Schemes Directory**| Searchable directory of Central & West Bengal schemes, eligibility criteria, required documents checklist, direct links to official `.gov.in` portals. |
| **10**| `/reports` | **Farmer Reports & History**| Consolidated diagnostic and advisory report, downloadable/printable PDF-ready view, audit history of scans and yield queries with timestamps. |
| **11**| `/settings` | **Settings & Privacy** | Language toggle (EN, BN, HI), offline storage status, cache management, data export (JSON), and complete local data erasure. |

---

## 5. Non-Functional Requirements (NFR)

1. **Performance**:
   - Initial page load < 2.0s on 4G networks.
   - Client-side on-device disease inference < 350ms via WebAssembly/ONNX Runtime Web.
   - API endpoints response time < 250ms ($p_{95}$).
2. **Offline Resilience**:
   - Installable PWA with service worker caching of assets, core advisories, and ONNX models.
   - Offline IndexedDB storage for scans and recommendations; automatic sync when online.
3. **Accessibility & Usability**:
   - Touch targets $\ge 48 \times 48\text{ px}$.
   - High contrast UI compliant with WCAG 2.1 AA.
   - Clean multilingual typography for Bengali (Bangla script) and Hindi (Devanagari script).
4. **Security & Data Governance**:
   - Zero storage of plain passwords (Argon2id hashing).
   - Strict input validation on all file uploads (MIME type verification, EXIF stripping, size cap).
   - No cross-tenant data leakage; isolated farm and scan records per user.
   - Complete audit trail of external data source retrieval timestamps.
