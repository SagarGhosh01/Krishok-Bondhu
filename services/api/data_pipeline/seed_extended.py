"""
AgriShield AI - Extended Database Seeder
Seeds Data Sources Registry, Official Schemes, Mandi Prices, and Historical Crop Yields.
"""

import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
import pandas as pd
from sqlalchemy.orm import Session

from services.api.database.models import DataSource, GovernmentScheme, MandiPrice, CropYieldRecord


DATA_SOURCES = [
    {
        "id": "upag_des",
        "name": "Unified Portal for Agricultural Statistics (UPAg) & DES",
        "publisher": "Directorate of Economics and Statistics, MoA&FW, GoI",
        "resource_url": "https://upag.gov.in/",
        "license": "Government Open Data License - India (GODL)",
        "category": "statistics",
        "sync_status": "active",
        "record_count": 2300,
    },
    {
        "id": "agmarknet",
        "name": "Agmarknet Wholesale Mandi Information Network",
        "publisher": "Directorate of Marketing & Inspection (DMI), MoA&FW, GoI",
        "resource_url": "https://agmarknet.gov.in/",
        "license": "Government Open Data License - India (GODL)",
        "category": "market",
        "sync_status": "active",
        "record_count": 540,
    },
    {
        "id": "imd_weather",
        "name": "India Meteorological Department (IMD) Agro-Met Services",
        "publisher": "Ministry of Earth Sciences, GoI / Open-Meteo Atmospheric Reanalysis",
        "resource_url": "https://mausam.imd.gov.in/",
        "license": "Public Meteorological Service Policy",
        "category": "weather",
        "sync_status": "active",
        "record_count": 365,
    },
    {
        "id": "soil_health_card",
        "name": "Soil Health Card Portal Standards",
        "publisher": "Department of Agriculture & Farmers Welfare, GoI",
        "resource_url": "https://soilhealth.dac.gov.in/",
        "license": "Government Official Technical Standards",
        "category": "soil",
        "sync_status": "active",
        "record_count": 12,
    },
    {
        "id": "icar_ibdc",
        "name": "ICAR & Indian Biological Data Centre (IBDC) Repositories",
        "publisher": "Indian Council of Agricultural Research & IBDC, DBT",
        "resource_url": "https://ibdc.dbt.gov.in/ibia/studybrowse/",
        "license": "Academic Research & Extension License",
        "category": "research",
        "sync_status": "active",
        "record_count": 17,
    },
    {
        "id": "plantvillage_benchmark",
        "name": "PlantVillage Diagnostic Benchmark (Supplementary Dataset)",
        "publisher": "Penn State University / Research Community",
        "resource_url": "https://plantvillage.psu.edu/",
        "license": "Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)",
        "category": "research",
        "sync_status": "active",
        "record_count": 54305,
    },
]

GOVERNMENT_SCHEMES = [
    {
        "id": "PM_KISAN",
        "code": "PM-KISAN",
        "title_en": "Pradhan Mantri Kisan Samman Nidhi",
        "title_hi": "प्रधानमंत्री किसान सम्मान निधि",
        "title_bn": "প্রধানমন্ত্রী কিষাণ সম্মান নিধি",
        "category": "Income Support",
        "sponsoring_agency": "Ministry of Agriculture & Farmers Welfare, GoI",
        "official_url": "https://pmkisan.gov.in/",
        "eligibility_criteria_json": json.dumps([
            "All landholding farmer families with cultivable land in their names",
            "Excludes institutional landholders and constitutional post holders",
            "Excludes income tax payees and retired pensioners receiving ₹10,000+ monthly"
        ]),
        "documents_required_json": json.dumps([
            "Aadhaar Card (Mandatory)",
            "Land Holding Record (RoR / Khatian / Parcha)",
            "Aadhaar-seeded Bank Account Passbook",
            "Active Mobile Number"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "₹6,000 per year paid in three equal 4-monthly instalments of ₹2,000 each directly via DBT",
            "coverage": "Pan-India small, marginal, and medium farming families"
        }),
        "last_verified_date": "2026-10-15"
    },
    {
        "id": "BSB_WB",
        "code": "BSB-WB",
        "title_en": "Bangla Shasya Bima (BSB)",
        "title_hi": "बांग्ला शस्य बीमा",
        "title_bn": "বাংলা শস্য বীমা (বিএসবি)",
        "category": "Crop Insurance",
        "sponsoring_agency": "Department of Agriculture, Government of West Bengal",
        "official_url": "https://banglashasyabima.net/",
        "eligibility_criteria_json": json.dumps([
            "All farmers cultivating notified crops in notified blocks of West Bengal",
            "Includes owner-cultivators, recorded tenant farmers, and unrecorded sharecroppers (Bargadars)",
            "No land area limit"
        ]),
        "documents_required_json": json.dumps([
            "Voter Card (EPIC) - Mandatory",
            "Aadhaar Card",
            "Recent Land Possession Certificate / Khatian or Gram Panchayat Certificate for sharecroppers",
            "Bank Passbook copy with IFSC",
            "Sowing / Crop Declaration Certificate"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "100% premium is borne entirely by the West Bengal Government. Farmers pay ZERO premium for all food & oilseed crops.",
            "coverage": "Aman & Boro Paddy, Potato, Maize, Jute, Wheat, Mustard, and Pulses against localized calamity, dry spells, and yield shortfalls"
        }),
        "last_verified_date": "2026-10-20"
    },
    {
        "id": "KRISHAK_BANDHU",
        "code": "KB-WB",
        "title_en": "Krishak Bandhu (Natun) Scheme",
        "title_hi": "कृषक बंधु (नया) योजना",
        "title_bn": "কৃষক বন্ধু (নতুন) প্রকল্প",
        "category": "Income Support & Social Security",
        "sponsoring_agency": "Department of Agriculture, Government of West Bengal",
        "official_url": "https://krishakbandhu.wb.gov.in/",
        "eligibility_criteria_json": json.dumps([
            "Resident farmers of West Bengal owning cultivable agricultural land",
            "Minimum land holding: Even 1 decimal land is eligible for pro-rata / base assistance",
            "Age limit for Death Benefit: 18 to 60 years"
        ]),
        "documents_required_json": json.dumps([
            "Voter ID (EPIC) Card",
            "Aadhaar Card",
            "Valid Land RoR (Khatian / Parcha) in applicant's name",
            "Bank Passbook copy",
            "Passport Size Photograph"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "Assured assistance up to ₹10,000 per year (minimum ₹4,000 per year) in two instalments (Kharif & Rabi). Death benefit of ₹2,00,000 to deceased farmer's family.",
            "coverage": "Over 10 million registered farmers and bargadars across all districts of West Bengal"
        }),
        "last_verified_date": "2026-10-18"
    },
    {
        "id": "PMFBY",
        "code": "PMFBY",
        "title_en": "Pradhan Mantri Fasal Bima Yojana",
        "title_hi": "प्रधानमंत्री फसल बीमा योजना",
        "title_bn": "প্রধানমন্ত্রী ফসল বীমা যোজনা",
        "category": "Crop Insurance",
        "sponsoring_agency": "Ministry of Agriculture & Farmers Welfare, GoI",
        "official_url": "https://pmfby.gov.in/",
        "eligibility_criteria_json": json.dumps([
            "All farmers growing notified crops in notified areas (loanee and non-loanee farmers)",
            "Compulsory enrolment optional for loanee farmers"
        ]),
        "documents_required_json": json.dumps([
            "Land document (LPC / Record of Rights)",
            "Aadhaar Card",
            "Sowing Certificate issued by Patwari / Extension Officer",
            "Bank Account Passbook"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "Farmer pays minimal premium: 2.0% for Kharif crops, 1.5% for Rabi crops, and 5.0% for annual commercial/horticultural crops. Balance premium shared equally by Central & State Govts.",
            "coverage": "Comprehensive risk coverage from pre-sowing to post-harvest damage"
        }),
        "last_verified_date": "2026-10-10"
    },
    {
        "id": "KCC",
        "code": "KCC",
        "title_en": "Kisan Credit Card (KCC) Scheme",
        "title_hi": "किसान क्रेडिट कार्ड योजना",
        "title_bn": "কিষাণ ক্রেডিট কার্ড প্রকল্প",
        "category": "Credit",
        "sponsoring_agency": "NABARD & Ministry of Agriculture & Farmers Welfare",
        "official_url": "https://myscheme.gov.in/schemes/kcc",
        "eligibility_criteria_json": json.dumps([
            "All farmers - individuals / joint borrowers who are owner cultivators",
            "Tenant farmers, oral lessees & sharecroppers",
            "Self Help Groups (SHGs) or Joint Liability Groups (JLGs) of farmers"
        ]),
        "documents_required_json": json.dumps([
            "Duly filled application form",
            "Identity Proof (Voter ID / Aadhaar / PAN)",
            "Address Proof",
            "Land Record certified by Revenue Authorities"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "Short-term credit limits up to ₹3,00,000 at concessional interest rate of 7%, further reduced to 4% with prompt repayment incentive (3% subvention). No collateral needed up to ₹1,60,000.",
            "coverage": "Crop production expenses, post-harvest expenses, farm asset maintenance"
        }),
        "last_verified_date": "2026-10-12"
    },
    {
        "id": "SHC_SCHEME",
        "code": "SHC",
        "title_en": "Soil Health Card Scheme",
        "title_hi": "मृदा स्वास्थ्य कार्ड योजना",
        "title_bn": "মৃত্তিকা স্বাস্থ্য কার্ড প্রকল্প",
        "category": "Soil & Inputs",
        "sponsoring_agency": "Department of Agriculture & Farmers Welfare, GoI",
        "official_url": "https://soilhealth.dac.gov.in/",
        "eligibility_criteria_json": json.dumps([
            "Open to all farmers holding agricultural land in India"
        ]),
        "documents_required_json": json.dumps([
            "Soil Sample collected as per official protocol (0-15 cm depth)",
            "Farm plot survey number & farmer identification"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "Free soil test report issued every 3 years containing nutrient status across 12 parameters (N, P, K, S, Zn, Fe, Cu, Mn, Bo, pH, EC, OC) with tailored crop-wise fertilizer dosage recommendations.",
            "coverage": "Soil health diagnostics and input cost reduction across India"
        }),
        "last_verified_date": "2026-10-14"
    },
    {
        "id": "PKVY",
        "code": "PKVY",
        "title_en": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "title_hi": "परंपरागत कृषि विकास योजना",
        "title_bn": "পরম্পরাগত কৃষি বিকাশ যোজনা",
        "category": "Organic Farming",
        "sponsoring_agency": "Department of Agriculture & Farmers Welfare, GoI",
        "official_url": "https://pgsindia-ncof.gov.in/",
        "eligibility_criteria_json": json.dumps([
            "Groups of farmers forming clusters of 50 or more farmers with 50 acres total land",
            "Individual farmers converting from conventional to organic agriculture"
        ]),
        "documents_required_json": json.dumps([
            "Cluster formation resolution & farmer registration",
            "Aadhaar Card",
            "Land ownership / lease records"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "Financial assistance of ₹50,000 per hectare over 3 years, of which ₹31,000/ha is directly transferred for organic inputs (bio-fertilizers, vermicompost, botanical extracts).",
            "coverage": "Participatory Guarantee System (PGS) organic certification and market linkage"
        }),
        "last_verified_date": "2026-10-08"
    },
    {
        "id": "SMAM",
        "code": "SMAM",
        "title_en": "Sub-Mission on Agricultural Mechanization (SMAM)",
        "title_hi": "कृषि यंत्रीकरण उप-मिशन",
        "title_bn": "কৃষি যান্ত্রিকীকরণ সাব-মিশন (মাটির কথা)",
        "category": "Subsidies & Machinery",
        "sponsoring_agency": "Ministry of Agriculture & West Bengal Agriculture Department",
        "official_url": "https://agrimachinery.nic.in/",
        "eligibility_criteria_json": json.dumps([
            "Small and marginal farmers, women farmers, SC/ST farmers in West Bengal",
            "Farmer Producer Organizations (FPOs) and Primary Agricultural Cooperative Societies (PACS)"
        ]),
        "documents_required_json": json.dumps([
            "Aadhaar Card & Voter ID",
            "Land Possession Certificate (Parcha)",
            "Bank Passbook copy",
            "Dealer Quotation for the registered agricultural equipment"
        ]),
        "benefits_summary_json": json.dumps({
            "financial_aid": "40% to 50% subsidy on purchase of tractors, power tillers, rotavators, sprayers, and threshers; up to 80% subsidy for setting up Custom Hiring Centers (CHCs) by FPOs.",
            "coverage": "Farm mechanization and labor productivity enhancement"
        }),
        "last_verified_date": "2026-10-11"
    }
]

WEST_BENGAL_MANDI_DATA = [
    # Potato
    {"market": "Burdwan (Purba Bardhaman)", "district": "Purba Bardhaman", "commodity": "Potato", "variety": "Jyoti", "min": 1420, "max": 1680, "modal": 1550, "arrivals": 850},
    {"market": "Memari (Purba Bardhaman)", "district": "Purba Bardhaman", "commodity": "Potato", "variety": "Jyoti", "min": 1450, "max": 1720, "modal": 1580, "arrivals": 1200},
    {"market": "Kalna (Purba Bardhaman)", "district": "Purba Bardhaman", "commodity": "Potato", "variety": "Chandramukhi", "min": 1600, "max": 1950, "modal": 1820, "arrivals": 420},
    {"market": "Sheoraphuli (Hooghly)", "district": "Hooghly", "commodity": "Potato", "variety": "Jyoti", "min": 1480, "max": 1740, "modal": 1620, "arrivals": 940},
    {"market": "Tarakeswar (Hooghly)", "district": "Hooghly", "commodity": "Potato", "variety": "Chandramukhi", "min": 1650, "max": 2000, "modal": 1850, "arrivals": 680},
    {"market": "Bishnupur (Bankura)", "district": "Bankura", "commodity": "Potato", "variety": "Jyoti", "min": 1380, "max": 1620, "modal": 1500, "arrivals": 510},
    {"market": "Medinipur Sadar (Paschim Medinipur)", "district": "Paschim Medinipur", "commodity": "Potato", "variety": "Jyoti", "min": 1400, "max": 1660, "modal": 1530, "arrivals": 630},
    
    # Tomato
    {"market": "Sheoraphuli (Hooghly)", "district": "Hooghly", "commodity": "Tomato", "variety": "Deshi Local", "min": 1850, "max": 2400, "modal": 2150, "arrivals": 320},
    {"market": "Ranaghat (Nadia)", "district": "Nadia", "commodity": "Tomato", "variety": "Hybrid Red", "min": 2000, "max": 2650, "modal": 2350, "arrivals": 280},
    {"market": "Barasat (North 24 Parganas)", "district": "North 24 Parganas", "commodity": "Tomato", "variety": "Hybrid Red", "min": 2100, "max": 2800, "modal": 2450, "arrivals": 410},
    {"market": "Mechhua / Kolkata (Kolkata)", "district": "Kolkata", "commodity": "Tomato", "variety": "Deshi Local", "min": 2200, "max": 2900, "modal": 2600, "arrivals": 750},
    {"market": "Suri (Birbhum)", "district": "Birbhum", "commodity": "Tomato", "variety": "Local", "min": 1750, "max": 2300, "modal": 2050, "arrivals": 180},

    # Maize
    {"market": "English Bazar (Malda)", "district": "Malda", "commodity": "Maize", "variety": "Yellow Hybrid", "min": 1950, "max": 2300, "modal": 2120, "arrivals": 560},
    {"market": "Cooch Behar (Cooch Behar)", "district": "Cooch Behar", "commodity": "Maize", "variety": "Yellow Hybrid", "min": 1920, "max": 2250, "modal": 2080, "arrivals": 430},
    {"market": "Berhampore (Murshidabad)", "district": "Murshidabad", "commodity": "Maize", "variety": "Yellow", "min": 1980, "max": 2320, "modal": 2150, "arrivals": 390},
    {"market": "Siliguri Regulated Market (Darjeeling/Jalpaiguri)", "district": "Jalpaiguri", "commodity": "Maize", "variety": "Yellow Hybrid", "min": 2020, "max": 2380, "modal": 2200, "arrivals": 620},

    # Paddy (Dhan)
    {"market": "Burdwan (Purba Bardhaman)", "district": "Purba Bardhaman", "commodity": "Paddy(Dhan)", "variety": "Swarna Common", "min": 2183, "max": 2350, "modal": 2260, "arrivals": 1850},
    {"market": "Katwa (Purba Bardhaman)", "district": "Purba Bardhaman", "commodity": "Paddy(Dhan)", "variety": "Minikit Fine", "min": 2400, "max": 2750, "modal": 2580, "arrivals": 920},
    {"market": "Sainthia (Birbhum)", "district": "Birbhum", "commodity": "Paddy(Dhan)", "variety": "Swarna Common", "min": 2183, "max": 2320, "modal": 2240, "arrivals": 1400},
    {"market": "Kotulpur (Bankura)", "district": "Bankura", "commodity": "Paddy(Dhan)", "variety": "Swarna Common", "min": 2183, "max": 2300, "modal": 2230, "arrivals": 1150},
    {"market": "Ghatal (Paschim Medinipur)", "district": "Paschim Medinipur", "commodity": "Paddy(Dhan)", "variety": "Minikit", "min": 2350, "max": 2680, "modal": 2520, "arrivals": 780},

    # Mustard
    {"market": "Ranaghat (Nadia)", "district": "Nadia", "commodity": "Mustard", "variety": "Yellow Mustard", "min": 5100, "max": 5750, "modal": 5450, "arrivals": 240},
    {"market": "Berhampore (Murshidabad)", "district": "Murshidabad", "commodity": "Mustard", "variety": "Black Mustard", "min": 4850, "max": 5400, "modal": 5150, "arrivals": 310},
    {"market": "Burdwan (Purba Bardhaman)", "district": "Purba Bardhaman", "commodity": "Mustard", "variety": "Yellow", "min": 5050, "max": 5650, "modal": 5350, "arrivals": 190},

    # Jute
    {"market": "Ranaghat (Nadia)", "district": "Nadia", "commodity": "Jute", "variety": "TD-5", "min": 5100, "max": 5850, "modal": 5500, "arrivals": 950},
    {"market": "Sheoraphuli (Hooghly)", "district": "Hooghly", "commodity": "Jute", "variety": "TD-5", "min": 5200, "max": 5950, "modal": 5600, "arrivals": 1120},
    {"market": "Beldanga (Murshidabad)", "district": "Murshidabad", "commodity": "Jute", "variety": "W-4", "min": 4900, "max": 5600, "modal": 5250, "arrivals": 840},
]


def seed_extended_entities(db: Session):
    """Seeds Data Sources, Schemes, Mandi Prices, and Historical Crop Yields."""
    print("[Seed Extended] Seeding data source registry...")
    for src in DATA_SOURCES:
        existing = db.query(DataSource).filter(DataSource.id == src["id"]).first()
        if not existing:
            ds = DataSource(
                id=src["id"],
                name=src["name"],
                publisher=src["publisher"],
                resource_url=src["resource_url"],
                license=src["license"],
                category=src["category"],
                sync_status=src["sync_status"],
                record_count=src["record_count"],
                last_successful_sync=datetime.now(timezone.utc),
            )
            db.add(ds)

    print("[Seed Extended] Seeding government schemes...")
    for sc in GOVERNMENT_SCHEMES:
        existing = db.query(GovernmentScheme).filter(GovernmentScheme.id == sc["id"]).first()
        if not existing:
            sch = GovernmentScheme(
                id=sc["id"],
                code=sc["code"],
                title_en=sc["title_en"],
                title_hi=sc["title_hi"],
                title_bn=sc["title_bn"],
                category=sc["category"],
                sponsoring_agency=sc["sponsoring_agency"],
                official_url=sc["official_url"],
                eligibility_criteria_json=sc["eligibility_criteria_json"],
                documents_required_json=sc["documents_required_json"],
                benefits_summary_json=sc["benefits_summary_json"],
                last_verified_date=sc["last_verified_date"],
            )
            db.add(sch)

    print("[Seed Extended] Seeding mandi wholesale price records...")
    # Seed historical 7-day trend for each market to enable charts
    today = datetime.now(timezone.utc).date()
    for m in WEST_BENGAL_MANDI_DATA:
        for day_offset in range(7):
            d = today - timedelta(days=day_offset)
            d_str = d.isoformat()
            existing = db.query(MandiPrice).filter(
                MandiPrice.market_name == m["market"],
                MandiPrice.commodity == m["commodity"],
                MandiPrice.arrival_date == d_str,
            ).first()
            if not existing:
                # Slight day-to-day fluctuation (within 3%)
                variation = (day_offset * 12) if day_offset % 2 == 0 else -(day_offset * 8)
                rec = MandiPrice(
                    state="West Bengal",
                    district=m["district"],
                    market_name=m["market"],
                    commodity=m["commodity"],
                    variety=m["variety"],
                    arrival_date=d_str,
                    min_price=float(m["min"] + variation),
                    max_price=float(m["max"] + variation),
                    modal_price=float(m["modal"] + variation),
                    arrivals_volume=float(max(50, m["arrivals"] - (day_offset * 20))),
                    source_timestamp=datetime.now(timezone.utc),
                )
                db.add(rec)

    print("[Seed Extended] Seeding historical crop yield records...")
    csv_path = Path("e:/AgriShield AI/ml/data/official_crop_yield_west_bengal.csv")
    if csv_path.exists():
        existing_count = db.query(CropYieldRecord).count()
        if existing_count < 100:
            df = pd.read_csv(csv_path)
            # Seed all records
            records_to_add = []
            for _, row in df.iterrows():
                rec = CropYieldRecord(
                    state=str(row["state"]),
                    district=str(row["district"]),
                    crop_year=int(row["crop_year"]),
                    season=str(row["season"]),
                    crop=str(row["crop"]),
                    area_hectares=float(row["area_hectares"]),
                    production_tonnes=float(row["production_tonnes"]),
                    yield_tonnes_per_hectare=float(row["yield_tonnes_per_hectare"]),
                    rainfall_mm=float(row["rainfall_mm"]) if pd.notnull(row["rainfall_mm"]) else None,
                    mean_temperature_celsius=float(row["mean_temperature_celsius"]) if pd.notnull(row["mean_temperature_celsius"]) else None,
                    irrigation_coverage_pct=float(row["irrigation_coverage_pct"]) if pd.notnull(row["irrigation_coverage_pct"]) else None,
                    source_name=str(row["source_name"]),
                )
                records_to_add.append(rec)
            db.bulk_save_objects(records_to_add)
            print(f"[Seed Extended] Bulk inserted {len(records_to_add)} historical crop yield records.")

    db.commit()
    print("[Seed Extended] Extended data seeding completed successfully.")
