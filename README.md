# AgriShield AI 🌾🛡️

> **Production-Minded, Research-Oriented Crop Disease Screening & Advisory Platform**
> *A Final-Year B.Tech Computer Science & Engineering Capstone Project*

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.13-ee4c2c.svg)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 1. Project Mission & Non-Negotiable Principles

AgriShield AI is built to provide trustworthy crop disease diagnosis and agronomical prevention guidance to farmers in rural areas.

1. **No Hallucinated Predictions or Metrics**: Every performance number is measured and reproducible from real code runs.
2. **Screening Aid, Not Final Diagnosis**: High softmax confidence is never presented as definitive medical proof; uncertainty is explicitly calibrated.
3. **Verified Agronomic Advisory**: No synthetic chemical recommendations or dosages. All advice is curated from state agricultural extension standards (ICAR / Agricultural Universities).
4. **Offline-First Resilience**: Full inference capability offline inside an installable Progressive Web App (PWA) via WebAssembly/ONNX Runtime Web, syncing seamlessly once network connectivity resumes.

---

## 2. Supported Crops & Classes (17 Classes)

- **Tomato (10 Classes)**:
  1. Tomato Bacterial Spot (`Xanthomonas`)
  2. Tomato Early Blight (`Alternaria solani`)
  3. Tomato Late Blight (`Phytophthora infestans`)
  4. Tomato Leaf Mold (`Passalora fulva`)
  5. Tomato Septoria Leaf Spot (`Septoria lycopersici`)
  6. Tomato Two-Spotted Spider Mites (`Tetranychus urticae`)
  7. Tomato Target Spot (`Corynespora cassiicola`)
  8. Tomato Yellow Leaf Curl Virus (TYLCV)
  9. Tomato Mosaic Virus (ToMV)
  10. Tomato Healthy
- **Potato (3 Classes)**:
  11. Potato Early Blight (`Alternaria solani`)
  12. Potato Late Blight (`Phytophthora infestans`)
  13. Potato Healthy
- **Corn / Maize (4 Classes)**:
  14. Corn Cercospora Leaf Spot / Gray Leaf Spot (`Cercospora zeae-maydis`)
  15. Corn Common Rust (`Puccinia sorghi`)
  16. Corn Northern Leaf Blight (`Exserohilum turcicum`)
  17. Corn Healthy

---

## 3. Directory Layout

```
agrishield-ai/
├── apps/
│   └── web/                   # React 19 + TypeScript + Vite + Tailwind CSS PWA
├── services/
│   └── api/                   # FastAPI backend (/api/v1) & SQLAlchemy database
├── ml/
│   ├── configs/               # Reproducible training configs (YAML/JSON)
│   ├── src/                   # PyTorch models, data pipeline, reliability, Grad-CAM
│   ├── tests/                 # Leakage checks, parity tests, calibration tests
│   ├── artifacts/             # Checkpoints, metrics curves, run metadata
│   └── export/                # ONNX and quantized model export pipelines
├── content/
│   └── diseases/              # Curated agronomy advisories in en, bn, hi
├── infrastructure/            # Docker, docker-compose, deployment scripts
├── docs/
│   ├── architecture.md        # Complete system architecture specification
│   ├── model-survey.md        # Pretrained model survey & scorecard
│   └── model-card.md          # Formal model card with limitations & ethics
├── .env.example               # Environment variables template
├── PROJECT_SPEC.md            # Master directive and project constraints
└── README.md                  # Project documentation
```

---

## 4. Acceptance Gates & Progress

| Phase | Description | Acceptance Gate | Status |
| :---: | :--- | :--- | :---: |
| **1** | Scaffolding, Architecture & Model Survey | `docs/architecture.md` & `docs/model-survey.md` exist; licenses recorded | **PASSED** ✅ |
| **2** | Dataset Audit, Deduplication & Splits | Split manifest generated; 0% leakage test passes | Next |
| **3** | Model Training, Baselines & Benchmarks | Scorecard populated with real runs; 3-seed results | Pending |
| **4** | Uncertainty Calibration, OOD & Grad-CAM | ECE before/after and OOD AUROC reported; 3 states | Pending |
| **5** | Model Export & Parity Verification | ONNX FP32/INT8 export; numerical tolerance $< 10^{-4}$ | Pending |
| **6** | Inference Service & FastAPI Endpoints | Real image produces genuine model output via API | Pending |
| **7** | Database, Auth & Scan History | SQLAlchemy migrations apply; cross-user isolation tested | Pending |
| **8** | Frontend 3-Screen Layout & Full Platform | Home, Recognition, Result + Library/Farms implemented | Pending |
| **9** | Multilingual (EN, BN, HI) Advisory Engine | Editorial workflow & translation completeness passes | Pending |
| **10**| Offline-First PWA & On-Device Web Worker | Offline inference runs via WASM/ONNX; IndexedDB syncs | Pending |
| **11**| Security Hardening, Packaging & Defense | Dockerized build, automated test suite passes | Pending |
