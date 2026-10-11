# AgriShield AI: Project Specification & Master Directive

A production-minded, research-oriented crop disease screening and advisory platform for farmers, agricultural students, and extension officers.

## 1. System Scope & Crops
- **Supported Crops**: Tomato, Potato, Corn (Maize)
- **Classes (17 Classes Total)**:
  - **Tomato (10)**: Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Yellow Leaf Curl Virus, Mosaic Virus, Healthy.
  - **Potato (3)**: Early Blight, Late Blight, Healthy.
  - **Corn / Maize (4)**: Cercospora Leaf Spot (Gray Leaf Spot), Common Rust, Northern Leaf Blight, Healthy.
- **Languages**: English (`en`), Bengali (`bn`), Hindi (`hi`).
- **Platforms**: Responsive Web, Installable PWA, On-device Edge Inference (ONNX Runtime Web), FastAPI cloud synchronization.

## 2. Core Operational Rules
1. Never fabricate predictions, metrics, dataset statistics, or test results.
2. Never substitute hardcoded or random outputs for model inference.
3. High confidence is not a confirmed diagnosis; UI explicitly states screening-aid disclaimer.
4. No synthetic pesticide names or hallucinated dosages; chemical controls refer only to state/ICAR extension officers and certified guidelines.
5. Strict offline PWA support with IndexedDB persistence, client-side UUID generation, and idempotent sync.
6. Calibrated uncertainty, image quality gating (blur, exposure, crop compatibility), and Grad-CAM visual explanations.
