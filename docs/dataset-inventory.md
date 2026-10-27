# AgriShield AI: Official Dataset Inventory & Data Governance Registry

This document establishes the official dataset registry and data governance protocol for **AgriShield AI**, following the Master Project Directives:
- Every data source is inspected for license, metadata, temporal/geographical coverage, units, and retrieval mechanics.
- Official Indian government repositories are prioritized.
- No fabricated data, endpoints, API keys, or hallucinated responses are permitted.
- Clear distinction is made between verified government data, research benchmarks, and fallback synthetic test fixtures.

---

## 1. Official Data Source Registry

| Source ID | Registry Name | Publisher & Authority | Resource URL | Primary Format | Temporal Coverage | Geographic Coverage | License & Access Policy | Ingestion Mechanism |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DS-01** | **UPAg (Unified Portal for Agricultural Statistics)** | Department of Agriculture & Farmers Welfare (DA&FW), Ministry of Agriculture & Farmers Welfare, GoI | `https://upag.gov.in/` | CSV, XLSX, REST API | 2000–2023 (Annual / Seasonal) | All Indian States & Districts (West Bengal focus) | National Data Sharing and Accessibility Policy (NDSAP) / Open Access | Automated batch ingestion with monthly refresh cache |
| **DS-02** | **Open Government Data (OGD) Platform India** | National Informatics Centre (NIC), Ministry of Electronics & IT, GoI | `https://data.gov.in/` | JSON, CSV, APIv2 | 1997–Present | District-level Pan-India | Government Open Data License - India (GODL) | REST API key-authenticated or public direct resource CSV |
| **DS-03** | **Agmarknet (Agricultural Marketing Information Network)** | Directorate of Marketing & Inspection (DMI), Ministry of Agriculture & Farmers Welfare, GoI | `https://agmarknet.gov.in/` | HTML, XML, REST API via OGD | Daily wholesale records (2010–Present) | 3,000+ regulated wholesale mandis across India | Public domain / Government Open Data | Daily scheduled ingestion with TTL = 6 hours |
| **DS-04** | **India Meteorological Department (IMD) / Agro-Met Services** | Ministry of Earth Sciences, GoI | `https://api.imd.gov.in/` & `https://mausam.imd.gov.in/` | JSON, GeoTIFF, Web Bulletins | Historical 1980–Present; 5-Day Forecast | District / Agro-Climatic Zone level | IMD Data Sharing Policy (Public Meteorological Service) | REST query with Open-Meteo high-resolution fallback |
| **DS-05** | **Soil Health Card Portal** | Department of Agriculture, Cooperation & Farmers Welfare, GoI | `https://soilhealth.dac.gov.in/` | Standardized Test Reports, Guidelines | Cycles I & II (2015–Present) | Village & District-level Soil Grids | Government Official Guidelines / Public Benchmark Standards | Deterministic rule engine against official Soil Health Card benchmark thresholds |
| **DS-06** | **ICAR / IBDC Plant Disease Repositories** | Indian Council of Agricultural Research & Indian Biological Data Centre (IBDC), DBT | `https://ibdc.dbt.gov.in/ibia/studybrowse/` | Image sets, Phenotyping metadata | Research studies | Indian agricultural research centres | Open Access for Academic & Research Use | Offline curatorial pipeline with manual verification |
| **DS-07** | **PlantVillage (Supplementary Research Benchmark)** | Penn State University / International Research Community | `https://plantvillage.psu.edu/` | Raw Leaf Images (JPEG) | Static Benchmark | Controlled lab/field photography | CC BY-SA 4.0 (Non-Government Research Dataset) | Filtered subset for Tomato, Potato, and Corn; explicit non-government attribution |

---

## 2. In-Depth Dataset Profiles & Governance

### 2.1 Historical Crop Area, Production & Yield (DS-01 & DS-02)
- **Publisher**: Directorate of Economics and Statistics (DES), Ministry of Agriculture & Farmers Welfare, Government of India.
- **Pilot Scope**: West Bengal districts (Purba Bardhaman, Paschim Bardhaman, Hooghly, Nadia, Murshidabad, Bankura, Birbhum, Malda, North 24 Parganas, South 24 Parganas, Jalpaiguri, Cooch Behar, etc.).
- **Key Attributes**:
  - `State_Name` (e.g., `West Bengal`)
  - `District_Name` (e.g., `Burdwan`, `Hooghly`)
  - `Crop_Year` (e.g., `2015`, `2020`)
  - `Season` (`Kharif`, `Rabi`, `Summer`, `Whole Year`)
  - `Crop` (`Rice`, `Potato`, `Maize`, `Tomato`, `Wheat`, `Jute`)
  - `Area` (Hectares)
  - `Production` (Tonnes)
  - `Yield` ($\text{Tonnes/Hectare} = \frac{\text{Production}}{\text{Area}}$)
- **Quality Controls & Validation**:
  - Rows with $\text{Area} \le 0$ or missing production are dropped.
  - Outlier verification: Yields $> 3 \times$ state biological maximums (e.g., Potato $> 45\text{ t/ha}$, Rice $> 8\text{ t/ha}$) are flagged for review.
  - Cleaned dataset preserved with checksum and generation timestamp.

### 2.2 Mandi Prices & Arrivals (DS-03)
- **Publisher**: Agmarknet / Directorate of Marketing & Inspection.
- **Coverage**: Primary West Bengal wholesale agricultural markets (e.g., Burdwan, Kalna, Katwa, Memari, Sheoraphuli, English Bazar, Siliguri, Mechhua/Kolkata).
- **Key Attributes**:
  - `Commodity`: Potato, Tomato, Maize, Paddy(Dhan), Mustard, Onion, Jute.
  - `State`: West Bengal (plus Pan-India comparisons).
  - `District`: District administrative jurisdiction.
  - `Market`: Mandi name.
  - `Min_Price`: Minimum transaction price during market session (₹/Quintal).
  - `Max_Price`: Maximum transaction price during market session (₹/Quintal).
  - `Modal_Price`: Most frequent price at which majority transactions occurred (₹/Quintal).
  - `Arrivals`: Total volume received on date (Quintals).
  - `Arrival_Date`: ISO-8601 date format (`YYYY-MM-DD`).
- **Limitation Notice**: Wholesale mandi prices reflect physical spot transactions and do not guarantee future sale values or farmgate retail prices.

### 2.3 Weather & Agro-Risk Data (DS-04)
- **Publisher**: India Meteorological Department (IMD) / Open-Meteo Meteorological Reanalysis.
- **Attributes**:
  - Hourly and daily summaries: Temperature 2m (°C), Relative Humidity (%), Precipitation (mm), Wind Speed (km/h), Cloud Cover (%).
  - Derived indices: Wallin's Blight Severity Values (BSV) for late blight warning, consecutive dry-day count for moisture stress.
- **Fallback Policy**:
  - If direct IMD gateway is temporarily throttled or undergoing maintenance, the system seamlessly pulls from the Open-Meteo European Centre for Medium-Range Weather Forecasts (ECMWF) / Global Forecast System (GFS) calibrated pipeline with timestamped source annotation.
  - The UI clearly labels measured vs. model-forecasted data.

### 2.4 Soil Health Card Standard Thresholds (DS-05)
- **Source Authority**: Department of Agriculture, Cooperation & Farmers Welfare, Ministry of Agriculture, GoI.
- **Official Parameter Classification Matrix**:

| Soil Parameter | Units | Low / Deficient | Medium / Normal | High / Excess | Agronomic Impact |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **pH (Reaction)** | scale | $< 6.5$ (Acidic) | $6.5 - 7.5$ (Neutral) | $> 7.5$ (Alkaline) | Nutrient availability & microbial activity |
| **EC (Conductivity)** | dS/m | $< 1.0$ (Normal) | $1.0 - 2.0$ (Slight Salinity)| $> 2.0$ (Harmful Salinity)| Osmotic stress on seed germination |
| **Organic Carbon (OC)**| % | $< 0.50\%$ | $0.50\% - 0.75\%$ | $> 0.75\%$ | Soil water retention & biological health |
| **Available Nitrogen (N)**| kg/ha | $< 280$ | $280 - 560$ | $> 560$ | Vegetative growth & canopy development |
| **Available Phosphorus (P)**| kg/ha | $< 10$ | $10 - 25$ | $> 25$ | Root elongation & flowering |
| **Available Potassium (K)**| kg/ha | $< 108$ | $108 - 280$ | $> 280$ | Disease resistance & drought tolerance |

---

## 3. Data Governance & Handling Rules

1. **Providence Tracking**: Every ingested record maintains `source_id`, `retrieval_timestamp`, and `data_version`.
2. **Offline Caching**: All public reference datasets (historical yields, mandi baselines, scheme directory) are packaged into SQLite/JSON caches to ensure full functionality during poor connectivity.
3. **Synthetic / Demo Data Separation**:
   - Any synthetic test fixtures used for deterministic unit testing are strictly quarantined under `tests/fixtures/` and never written into production database tables.
   - Any demonstration data is visibly tagged in the UI with a `"Demo / Offline Simulation Mode"` badge.
4. **Stale Data Protocols**: If live API refresh exceeds 24 hours without successful connection, the UI highlights a yellow `"Cached Data (Observed on DD-MM-YYYY)"` indicator with a manual refresh button.
