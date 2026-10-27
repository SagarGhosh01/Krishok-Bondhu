"""
AgriShield AI - Database Seeder
Seeds verified taxonomy, multilingual advisories (en, bn, hi), model version,
and default test user accounts into the database.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from services.api.core.config import settings
from services.api.core.security import hash_password
from services.api.database.connection import SessionLocal, Base, engine
from services.api.database.models import User, Disease, DiseaseTranslation, Advisory, ModelVersion
from ml.src.data.classes import CLASS_NAMES, TAXONOMY_METADATA


def seed_database(db: Session = None):
    close_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_at_end = True

    try:
        print("[Seed] Initializing database seeding...")

        # 1. Seed Users
        existing_admin = db.query(User).filter(User.email == "admin@agrishield.ai").first()
        if not existing_admin:
            admin_user = User(
                email="admin@agrishield.ai",
                full_name="Agronomy Admin",
                hashed_password=hash_password("Admin@12345"),
                role="admin",
                preferred_language="en",
            )
            db.add(admin_user)

        existing_farmer = db.query(User).filter(User.email == "farmer@agrishield.ai").first()
        if not existing_farmer:
            farmer_user = User(
                email="farmer@agrishield.ai",
                full_name="Alex William",  # Matching UI screenshot greeting
                hashed_password=hash_password("Farmer@12345"),
                role="farmer",
                preferred_language="en",
            )
            db.add(farmer_user)

        db.commit()

        # 2. Seed Diseases
        content_dir = settings.BASE_DIR / "content" / "diseases"
        with open(content_dir / "en" / "advisories.json", "r", encoding="utf-8") as f:
            en_data = json.load(f)
        with open(content_dir / "bn" / "advisories.json", "r", encoding="utf-8") as f:
            bn_data = json.load(f)
        with open(content_dir / "hi" / "advisories.json", "r", encoding="utf-8") as f:
            hi_data = json.load(f)

        for class_key in CLASS_NAMES:
            meta = TAXONOMY_METADATA[class_key]
            disease = db.query(Disease).filter(Disease.class_key == class_key).first()
            if not disease:
                disease = Disease(
                    class_key=class_key,
                    crop=meta["crop"],
                    scientific_name=meta["scientific_name"],
                    pathogen_type=meta["pathogen_type"],
                    is_healthy=meta["is_healthy"],
                )
                db.add(disease)
                db.flush()

            # Translations & Advisories
            lang_payloads = [("en", en_data.get(class_key, {})), ("bn", bn_data.get(class_key, {})), ("hi", hi_data.get(class_key, {}))]

            for lang, payload in lang_payloads:
                if not payload:
                    continue

                # Translation
                trans = db.query(DiseaseTranslation).filter(
                    DiseaseTranslation.disease_id == disease.id,
                    DiseaseTranslation.language == lang,
                ).first()
                if not trans:
                    trans = DiseaseTranslation(
                        disease_id=disease.id,
                        language=lang,
                        display_name=payload.get("display_name", class_key),
                        description=payload.get("description", ""),
                        symptoms=payload.get("symptoms", ""),
                    )
                    db.add(trans)

                # Advisory
                adv = db.query(Advisory).filter(
                    Advisory.disease_id == disease.id,
                    Advisory.language == lang,
                ).first()
                if not adv:
                    adv = Advisory(
                        disease_id=disease.id,
                        language=lang,
                        cultural_practices=payload.get("cultural_practices", ""),
                        biological_control=payload.get("biological_control", ""),
                        chemical_reference=payload.get("chemical_reference", ""),
                        source_title=payload.get("source_title", "ICAR Extension"),
                        source_url=payload.get("source_url", "https://icar.org.in"),
                        editorial_status="published",
                        reviewer_name=payload.get("reviewer_name", "ICAR Agronomist"),
                        review_date=datetime.now(timezone.utc),
                    )
                    db.add(adv)

        db.commit()

        # 3. Seed Model Version
        meta_file = settings.MODEL_DIR / "metadata.json"
        temp = 1.0
        ood_thr = -3.3
        hash_val = "initial-deployed-weights"
        if meta_file.exists():
            with open(meta_file, "r", encoding="utf-8") as f:
                m_info = json.load(f)
                temp = m_info.get("calibration", {}).get("temperature", 1.0)
                ood_thr = m_info.get("reliability_thresholds", {}).get("ood_energy_threshold", -3.3)
                hash_val = m_info.get("artifacts", {}).get("fp32", {}).get("sha256", hash_val)

        existing_mv = db.query(ModelVersion).filter(ModelVersion.version_str == "1.0.0").first()
        if not existing_mv:
            mv = ModelVersion(
                version_str="1.0.0",
                backbone="mobilenet_v3_large",
                weights_hash=hash_val,
                temperature=temp,
                ood_threshold=ood_thr,
                is_active=True,
            )
            db.add(mv)
            db.commit()

        # 4. Extended Entities: Data Sources, Government Schemes, Mandi Prices, Crop Yield Records
        from services.api.data_pipeline.seed_extended import seed_extended_entities
        seed_extended_entities(db)

        print("[Seed] Successfully seeded all taxonomy, multilingual advisories, users, model versions, data sources, schemes, mandi prices, and crop yields.")

    finally:
        if close_at_end:
            db.close()


if __name__ == "__main__":
    seed_database()
