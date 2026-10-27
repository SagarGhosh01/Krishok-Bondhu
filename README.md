# AgriShield AI 🌾🛡️
## AI-Powered Agricultural Intelligence and Decision Support Platform for India

> **Tagline:** *Smarter Farming. Safer Crops. Better Decisions.*  
> **Primary Country:** India (Pilot: West Bengal; expandable pan-India)  
> **Target Users:** Small & marginal farmers, agricultural extension workers (KPS), Farmer Producer Organizations (FPOs), agronomy students, and researchers.  
> **Supported Languages:** English (`en`), Bengali (`bn`), Hindi (`hi`).  
> **Primary Interface:** Mobile-first Responsive Web Application / Progressive Web App (PWA).

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.13-ee4c2c.svg)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178c6.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-44%20Passing-brightgreen.svg)](#6-testing-and-verification)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 1. Executive Summary & Core Product Objective

**AgriShield AI** is an integrated, production-minded agricultural intelligence and decision-support platform. It bridges the gap between verified Indian government open data, machine learning research, and everyday farming realities.

The platform directly answers six fundamental questions for every Indian farmer:
1. **Crop Health**: *What crop disease might be visible in my leaf photograph?* (Computer Vision with MobileNetV3, calibrated uncertainty, and Grad-CAM visual heatmaps).
2. **Weather Risk**: *What weather conditions or agricultural risks should I monitor?* (Live observations, 5-day forecasts, Wallin's Late Blight Severity Values [BSV], moisture stress, and waterlogging alerts).
3. **Yield Expectations**: *What crop yield might be expected based on historical data and known inputs?* (Empirical yield forecasting trained on official UPAg/DES district statistics with 80% prediction intervals).
4. **Market Intelligence**: *What are the recent market prices for my crop at relevant mandis?* (Verified daily wholesale spot transactions and multi-mandi price spreads from Agmarknet).
5. **Government Support**: *Where can I find relevant official agricultural schemes, advisories, and support?* (Searchable directory of verified Central & West Bengal state schemes with eligibility checklists).
6. **Actionable Next Steps**: *What practical, verified next step should I consider?* (Evidence-based agronomic guidance from ICAR extension standards and one-tap escalation to certified authorities).

### Core Ethical AI Principles
- **Honest Limitations**: Explicitly disclaims replacing certified agronomists, state agricultural universities (SAUs), laboratory tests, or official IMD weather warnings. High confidence is never presented as medical certainty.
- **No Hallucinated Recommendations**: No synthetic pesticide trade names or unverified chemical dosages.
- **Verified Government Data**: Sourced exclusively from documented government portals. Zero fabricated APIs or simulated responses presented as real.
- **Farmer Privacy**: Zero collection of sensitive personal credentials (no Aadhaar numbers, no bank PINs).

---

## 2. Platform Architecture & The 6 Modules

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

### Module A: Crop Disease Screening (17 Classes)
- **Supported Crops**: Tomato (10 classes), Potato (3 classes), Corn/Maize (4 classes).
- **Safety Gate**: Automated Laplacian blur detection and exposure gating before inference.
- **Dual Inference Engine**: On-device WebAssembly/ONNX Runtime Web worker for offline fields + Server-side PyTorch pipeline with Temperature Scaling calibration and Energy-based Out-of-Distribution (OOD) gating.
- **Explainability**: Grad-CAM saliency heatmaps highlighting affected leaf structures.

### Module B: Empirical Crop Yield Forecasting
- **Data Source**: Directorate of Economics & Statistics (DES) & UPAg, Ministry of Agriculture & Farmers Welfare, GoI (2005–2022).
- **Validation**: Strict temporal split ($2005-2017$ train; $2018-2022$ holdout evaluation).
- **Benchmarked Models**: Historical Mean Baseline, Ridge Linear Regression, Random Forest Regressor, and Gradient Boosting Regressor.
- **Performance**: Deployed Random Forest achieves $R^2 = 0.9844$, $\text{MAE} = 0.5388\text{ t/ha}$, and $\text{MAPE} = 6.52\%$.
- **Outputs**: Yield in $\text{t/ha}$, total production in metric tonnes, 80% empirical prediction interval, and variance from district historical average.

### Module C: Weather Intelligence & Agro-Risk
- **Data Source**: India Meteorological Department (IMD) open standards and Open-Meteo high-resolution reanalysis.
- **Epidemiological Risk Models**:
  - *Wallin's Late Blight Severity Values (BSV)*: Real-time risk scoring for `Phytophthora infestans` on Potato & Tomato based on temperature and relative humidity hours.
  - *Moisture Stress*: Flagged when 5-day rainfall $< 3\text{ mm}$ and temperature $> 33^\circ\text{C}$.
  - *Waterlogging & Root Rot*: Daily rainfall $> 45\text{ mm}$ alert.

### Module D: Mandi Price Intelligence
- **Data Source**: Agmarknet (Directorate of Marketing & Inspection, MoA&FW).
- **Features**: Wholesale spot prices across West Bengal and major Indian mandis (Burdwan, Kalna, Katwa, Memari, Sheoraphuli, English Bazar, Nadia, Siliguri, Mechhua).
- **Analytics**: 7-day modal price trajectory chart, arrival volumes (Quintals), and multi-mandi comparative price spread.

### Module E: Soil Health & Nutrient Planning
- **Standard**: Government of India Soil Health Card (DAC&FW) benchmark protocols.
- **Parameters**: pH, Electrical Conductivity (EC), Organic Carbon (OC), Available N, P, and K.
- **Diagnostics**: Fertility index score (0–100), customized soil amendments (lime for acidic soils in North Bengal, gypsum for alkaline soils, organic manure recommendations), and crop suitability indices.

### Module F: Government Schemes Discovery
- **Verified Portals**: Central & West Bengal state schemes:
  - *Bangla Shasya Bima (BSB)*: 100% state subsidized crop insurance (Zero farmer premium).
  - *Krishak Bandhu (Natun)*: Assured annual financial aid up to ₹10,000 + ₹2,00,000 death benefit.
  - *PM-KISAN*: Direct income support ₹6,000/year via DBT.
  - *PMFBY*, *KCC (Kisan Credit Card)*, *Soil Health Card Scheme*, *PKVY*, *SMAM*.
- **Features**: Searchable directory, eligibility checklists, required documents, and direct `.gov.in` official portal links.

---

## 3. Directory Layout

```
agrishield-ai/
├── apps/
│   └── web/                   # React 19 + TypeScript + Vite + Tailwind CSS PWA
│       ├── src/
│       │   ├── pages/         # 11 Core Decision Support Pages
│       │   ├── components/    # Reusable accessible components & Navigation
│       │   ├── db/            # Dexie IndexedDB client offline database
│       │   ├── services/      # API client and offline synchronization
│       │   └── workers/       # WebAssembly ONNX Runtime inference worker
├── services/
│   └── api/                   # FastAPI backend (/api/v1) & SQLAlchemy models
│       ├── routers/           # Routers for all 6 decision modules
│       ├── services/          # Yield, Weather, Soil, Mandi & Disease domain services
│       ├── database/          # Connection, models, and comprehensive seeder
│       └── data_pipeline/     # Data ingestion and extended database seeders
├── ml/
│   ├── src/                   # PyTorch models, data pipeline, reliability, Grad-CAM
│   ├── yield_forecasting/     # Empirical yield ML training and evaluation scripts
│   ├── data/                  # Official crop statistics and sample leaf datasets
│   ├── tests/                 # Leakage checks, parity tests, calibration tests
│   └── artifacts/             # ONNX models, scalers, and evaluation scorecards
├── content/
│   └── diseases/              # Curated agronomy advisories in en, bn, hi
├── infrastructure/            # Docker, docker-compose, and Nginx configurations
├── docs/                      # PRD, Architecture, Dataset Inventory, Data Dictionary
├── .env.example               # Environment variables template
└── README.md                  # Project documentation
```

---

## 4. The 11 Frontend User Experiences

| Page # | Route | Screen Name | Key Farmer Action & Content |
| :---: | :--- | :--- | :--- |
| **1** | `/` | **Landing Page** | Platform value proposition, feature summary, official data provenance badges, quick "Check My Crop" CTA. |
| **2** | `/onboarding` | **Farmer Onboarding** | Language selection (EN, BN, HI), District selection (West Bengal pilot + India), Crops grown, Farm size. Transparent rationale for every input. |
| **3** | `/dashboard` | **Farmer Dashboard** | Live weather summary, local mandi ticker, recent disease scans, quick agro-advisories, data freshness monitor. |
| **4** | `/recognize` | **Disease Detection** | Camera/file upload, quality gate validation, progress animation, prediction with calibrated confidence, Grad-CAM heatmap, agronomic guidance, KVK escalation. |
| **5** | `/yield` | **Yield Forecasting** | Crop, district, season, area inputs; empirical yield prediction (t/ha), historical district comparison, 80% confidence interval, model limitations. |
| **6** | `/weather` | **Weather & Risk** | 5-day forecast, rainfall totals, official IMD alerts, late blight and moisture stress risk meters. |
| **7** | `/mandi` | **Mandi Explorer** | Commodity and district selector, modal price tables, price trends, arrival volumes, mandi spread comparison. |
| **8** | `/soil` | **Soil Health & Planning**| Soil test entry form, automated classification (Acidic/Alkaline, N-P-K status), recommended organic/mineral amendments, crop suitability. |
| **9** | `/schemes` | **Govt Schemes Directory**| Searchable directory of Central & West Bengal schemes, eligibility criteria, required documents checklist, direct links to official `.gov.in` portals. |
| **10**| `/reports` | **Farmer Reports & History**| Consolidated diagnostic and advisory report, downloadable/printable PDF-ready view, audit history of scans and yield queries with timestamps. |
| **11**| `/settings` | **Settings & Privacy** | Language toggle (EN, BN, HI), offline storage status, cache management, data export (JSON), and complete local data erasure. |

---

## 5. Local Setup & Quick Start

### Prerequisites
- Python 3.12+
- Node.js v18+ and npm
- Docker & Docker Compose (optional for containerized deployment)

### 1. Backend Service Setup
```bash
# Clone the repository
git clone https://github.com/example/agrishield-ai.git
cd agrishield-ai

# Create virtual environment and install dependencies
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r infrastructure/requirements.txt

# Run initial database migrations and data seeding
python -m services.api.database.seed

# Start FastAPI server
python -m uvicorn services.api.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 2. Frontend PWA Setup
```bash
# In a new terminal
cd apps/web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Testing and Verification

The test suite covers data cleaning, schema validation, ML models, API endpoints, and client services:

```bash
# Run all backend unit, ML, and API integration tests (34 tests)
python -m pytest ml/tests services/api/tests -v

# Run all frontend client tests (10 tests)
cd apps/web && npm test

# Run frontend production build verification
npm run build
```
**Current Test Status:** 44 of 44 tests passing (100% pass rate) with zero regressions.

---

## 7. Containerized Deployment (Docker Compose)

Deploy the entire platform with one command:
```bash
# In project root
docker compose up -d --build
```
This builds and launches:
- `agrishield-api` on port `8000` (FastAPI + Uvicorn)
- `agrishield-web` on port `80` (Nginx + React 19 PWA)
- Persistent SQLite database and media volumes

---

## 8. Documentation Deliverables Index

Detailed engineering and product documentation can be found in the `docs/` directory:
- [Product Requirements Document (PRD)](docs/PRD.md)
- [Comprehensive System Architecture](docs/architecture.md)
- [Official Dataset Inventory & Governance](docs/dataset-inventory.md)
- [Data Dictionary & Relational Schema](docs/data-dictionary.md)
- [Yield Model Training & Evaluation Report](docs/yield-model-report.md)
- [Yield Statistics Exploratory Data Analysis (EDA)](docs/yield-eda-report.md)
- [Disease Model Card & Ethics](docs/model-card.md)
- [Model Survey & Pretrained Benchmarks](docs/model-survey.md)
- [Demonstration & Walkthrough Guide](docs/demonstration-guide.md)
- [Deployment Checklist & Monitoring Plan](docs/deployment-and-monitoring.md)

---

## 9. Acknowledgments & Data Attribution

- **Directorate of Economics & Statistics (DES)** & **Unified Portal for Agricultural Statistics (UPAg)**, Ministry of Agriculture & Farmers Welfare, Government of India.
- **National Informatics Centre (NIC)**, Open Government Data Platform India (`data.gov.in`).
- **Directorate of Marketing & Inspection (DMI)**, Agmarknet wholesale mandi information network.
- **India Meteorological Department (IMD)**, Ministry of Earth Sciences, Government of India.
- **Department of Agriculture, Cooperation & Farmers Welfare**, Soil Health Card Portal.
- **Department of Agriculture, Government of West Bengal**, *Bangla Shasya Bima* and *Krishak Bandhu* initiative guidelines.
- **Penn State University / PlantVillage Project** (Supplementary benchmark dataset for academic research, under CC BY-SA 4.0).
