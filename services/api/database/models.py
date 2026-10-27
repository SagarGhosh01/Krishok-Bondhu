"""
AgriShield AI - Relational Database Schema Models (SQLAlchemy 2.0)
Defines all primary domain entities with UUID primary keys, foreign keys,
indexes, and relations.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from services.api.database.connection import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="farmer", nullable=False)  # farmer, student, expert, admin
    preferred_language = Column(String(10), default="en", nullable=False)  # en, bn, hi
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user")


class Farm(Base):
    __tablename__ = "farms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    soil_type = Column(String(100), nullable=True)
    area_acres = Column(Float, nullable=True)
    crops_grown = Column(String(255), nullable=True)  # Comma-separated (Tomato, Potato, Corn)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    owner = relationship("User", back_populates="farms")
    scans = relationship("Scan", back_populates="farm")


class Disease(Base):
    __tablename__ = "diseases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    class_key = Column(String(100), unique=True, nullable=False, index=True)
    crop = Column(String(50), nullable=False, index=True)  # Tomato, Potato, Corn
    scientific_name = Column(String(255), nullable=False)
    pathogen_type = Column(String(100), nullable=False)  # Fungal, Bacterial, Viral, None
    is_healthy = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    translations = relationship("DiseaseTranslation", back_populates="disease", cascade="all, delete-orphan")
    advisories = relationship("Advisory", back_populates="disease", cascade="all, delete-orphan")


class DiseaseTranslation(Base):
    __tablename__ = "disease_translations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    disease_id = Column(String(36), ForeignKey("diseases.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(10), nullable=False, index=True)  # en, bn, hi
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    symptoms = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    disease = relationship("Disease", back_populates="translations")

    __table_args__ = (
        Index("idx_disease_lang", "disease_id", "language", unique=True),
    )


class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    disease_id = Column(String(36), ForeignKey("diseases.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(10), nullable=False, index=True)  # en, bn, hi
    cultural_practices = Column(Text, nullable=False)
    biological_control = Column(Text, nullable=False)
    chemical_reference = Column(Text, nullable=False)  # Locally approved guidance disclaimer & extension referral
    source_title = Column(String(255), nullable=False)
    source_url = Column(String(512), nullable=False)
    editorial_status = Column(String(50), default="reviewed", nullable=False)  # draft, reviewed, published
    reviewer_name = Column(String(255), nullable=True)
    review_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    disease = relationship("Disease", back_populates="advisories")

    __table_args__ = (
        Index("idx_advisory_lang", "disease_id", "language", unique=True),
    )


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    version_str = Column(String(50), unique=True, nullable=False)
    backbone = Column(String(100), nullable=False)
    weights_hash = Column(String(64), nullable=False)
    temperature = Column(Float, default=1.0, nullable=False)
    ood_threshold = Column(Float, default=-3.3, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    predictions = relationship("Prediction", back_populates="model_version")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_uuid = Column(String(36), unique=True, nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True)
    image_path = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=False)
    image_size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    blur_score = Column(Float, nullable=False)
    luminance = Column(Float, nullable=False)
    is_offline_captured = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="scans")
    farm = relationship("Farm", back_populates="scans")
    prediction = relationship("Prediction", back_populates="scan", uselist=False, cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, unique=True)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    predicted_class = Column(String(100), nullable=True)
    crop = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=False)
    calibrated_confidence = Column(Float, nullable=False)
    reliability_score = Column(Float, nullable=False)
    diagnostic_state = Column(String(50), nullable=False)  # CONFIDENT, UNCERTAIN, CANNOT_ASSESS
    top_alternatives_json = Column(Text, nullable=True)
    gradcam_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="prediction")
    model_version = relationship("ModelVersion", back_populates="predictions")
    feedbacks = relationship("Feedback", back_populates="prediction", cascade="all, delete-orphan")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prediction_id = Column(String(36), ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reported_correct = Column(Boolean, nullable=False)
    suggested_class = Column(String(100), nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    prediction = relationship("Prediction", back_populates="feedbacks")
    user = relationship("User", back_populates="feedbacks")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String(50), primary_key=True)  # e.g., 'upag_des', 'agmarknet', 'imd_weather', 'soil_health_card'
    name = Column(String(150), nullable=False)
    publisher = Column(String(200), nullable=False)
    resource_url = Column(String(512), nullable=False)
    license = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)  # statistics, market, weather, soil, schemes
    last_successful_sync = Column(DateTime, nullable=True)
    sync_status = Column(String(50), default="active", nullable=False)  # active, stale, offline, cached
    record_count = Column(Integer, default=0, nullable=False)
    error_log = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class CropYieldRecord(Base):
    __tablename__ = "crop_yield_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    state = Column(String(60), nullable=False, index=True)
    district = Column(String(60), nullable=False, index=True)
    crop_year = Column(Integer, nullable=False, index=True)
    season = Column(String(30), nullable=False)  # Kharif, Rabi, Summer
    crop = Column(String(60), nullable=False, index=True)
    area_hectares = Column(Float, nullable=False)
    production_tonnes = Column(Float, nullable=False)
    yield_tonnes_per_hectare = Column(Float, nullable=False)
    rainfall_mm = Column(Float, nullable=True)
    mean_temperature_celsius = Column(Float, nullable=True)
    irrigation_coverage_pct = Column(Float, nullable=True)
    source_name = Column(String(100), default="UPAg / DES", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_yield_state_dist_crop", "state", "district", "crop", "crop_year"),
    )


class MandiPrice(Base):
    __tablename__ = "mandi_prices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    state = Column(String(60), nullable=False, index=True)
    district = Column(String(60), nullable=False, index=True)
    market_name = Column(String(100), nullable=False, index=True)
    commodity = Column(String(60), nullable=False, index=True)
    variety = Column(String(60), nullable=True)
    arrival_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    min_price = Column(Float, nullable=False)  # ₹ / Quintal
    max_price = Column(Float, nullable=False)  # ₹ / Quintal
    modal_price = Column(Float, nullable=False)  # ₹ / Quintal
    arrivals_volume = Column(Float, nullable=False)  # Quintals
    source_timestamp = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_mandi_query", "state", "district", "commodity", "arrival_date"),
    )


class SoilTestRecord(Base):
    __tablename__ = "soil_tests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True)
    sample_date = Column(String(20), nullable=False)
    ph = Column(Float, nullable=False)
    electrical_conductivity = Column(Float, nullable=False)
    organic_carbon_pct = Column(Float, nullable=False)
    available_nitrogen = Column(Float, nullable=False)
    available_phosphorus = Column(Float, nullable=False)
    available_potassium = Column(Float, nullable=False)
    fertility_rating = Column(String(30), nullable=False)  # High, Medium, Low, Acidic, Alkaline
    recommendations_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class GovernmentScheme(Base):
    __tablename__ = "government_schemes"

    id = Column(String(50), primary_key=True)  # e.g., 'PM_KISAN', 'BSB_WB', 'KRISHAK_BANDHU'
    code = Column(String(50), unique=True, nullable=False)
    title_en = Column(String(150), nullable=False)
    title_hi = Column(String(200), nullable=False)
    title_bn = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # Income Support, Insurance, Credit, Subsidies
    sponsoring_agency = Column(String(150), nullable=False)
    official_url = Column(String(512), nullable=False)
    eligibility_criteria_json = Column(Text, nullable=False)
    documents_required_json = Column(Text, nullable=False)
    benefits_summary_json = Column(Text, nullable=False)
    last_verified_date = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
