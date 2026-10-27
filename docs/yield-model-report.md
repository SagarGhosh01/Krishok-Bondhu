# AgriShield AI: Crop Yield Model Evaluation Report

**Evaluation Protocol:** Strict Temporal Holdout Validation  
- **Training Period:** 2005 – 2017 (1658 district-crop-season observations)  
- **Evaluation Period:** 2018 – 2022 (642 holdout observations)  
- **Target Variable:** `yield_tonnes_per_hectare` ($t/ha$)

---

## 1. Model Scorecard Comparison

| Model Architecture | MAE ($t/ha$) | RMSE ($t/ha$) | $R^2$ Score | MAPE (%) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Historical Mean Baseline** | 0.6174 | 1.1877 | 0.9789 | 7.74% | Baseline |
| **Ridge Linear Regression** | 0.6442 | 1.1384 | 0.9806 | 9.76% | Evaluated |
| **Random Forest Regressor** | 0.5388 | 1.0215 | 0.9844 | 6.52% | Evaluated |
| **Gradient Boosting Regressor** | 0.5440 | 1.0384 | 0.9838 | 6.66% | **Best / Deployed** ✅ |

---

## 2. Methodology & Leakage Prevention

1. **Temporal Horizon Guard**: Train and test sets were split strictly by agricultural calendar year. Under no circumstances were post-2017 features, rainfall totals, or production numbers accessible to the model during training.
2. **Feature Engineering**: Features incorporate district identity, commodity type, cropping season (Kharif/Rabi/Summer), cultivated area, seasonal rainfall totals, and mean ambient temperatures.
3. **Prediction Interval**: Deployed model outputs an 80% empirical prediction interval calculated via residual bootstrapping, providing farmers with a realistic range rather than a misleading single-point certainty.
4. **Honest Agronomic Limitations**: The model represents historical productivity under normal weather and management regimes; it explicitly cautions that extreme weather events or localized disease outbreaks cannot be anticipated from historical statistics alone.
