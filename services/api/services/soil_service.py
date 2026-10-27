"""
AgriShield AI - Soil Health Diagnostic & Planning Engine
Evaluates soil-test parameters against official GoI Soil Health Card (DAC&FW) benchmarks,
generates evidence-based amelioration guidelines, and computes crop suitability indices.
"""

from typing import Dict, Any, List


class SoilDiagnosticService:
    def evaluate_soil_test(
        self,
        ph: float,
        electrical_conductivity: float,
        organic_carbon_pct: float,
        available_nitrogen: float,
        available_phosphorus: float,
        available_potassium: float,
        zinc_ppm: float = 0.8,
        iron_ppm: float = 6.5,
    ) -> Dict[str, Any]:
        """
        Evaluates soil test parameters according to official Soil Health Card criteria.
        """
        # 1. pH evaluation
        if ph < 5.5:
            ph_status = "Strongly Acidic"
            ph_advisory = "Soil is strongly acidic. Apply agricultural lime (CaCO3) @ 2.5 - 4.0 tonnes/hectare at least 3 weeks prior to sowing. Avoid acid-forming fertilizers."
        elif ph < 6.5:
            ph_status = "Moderately Acidic"
            ph_advisory = "Soil is moderately acidic. Ideal for Potato and Tea. If planting pulses or oilseeds, apply 1.0 - 1.5 tonnes/ha of agricultural lime."
        elif ph <= 7.5:
            ph_status = "Neutral (Optimal)"
            ph_advisory = "Soil reaction is near neutral and optimal for maximum nutrient availability across all crops."
        elif ph <= 8.5:
            ph_status = "Moderately Alkaline"
            ph_advisory = "Soil is alkaline. Micronutrient availability (Zinc, Iron) may be restricted. Apply FYM and consider soil sulfur or ammonium-based nitrogen."
        else:
            ph_status = "Strongly Alkaline / Sodic"
            ph_advisory = "Soil is strongly alkaline/sodic. Apply agricultural gypsum (CaSO4.2H2O) @ 3.0 - 5.0 tonnes/hectare followed by deep flooding to leach sodium."

        # 2. Electrical Conductivity (EC)
        if electrical_conductivity < 1.0:
            ec_status = "Normal (Non-Saline)"
            ec_advisory = "Soluble salt concentration is low and safe for all crop germination."
        elif electrical_conductivity <= 2.0:
            ec_status = "Slightly Saline"
            ec_advisory = "Slight salinity. Tolerable by mature crops but may retard sensitive vegetable seedling emergence."
        else:
            ec_status = "High Salinity"
            ec_advisory = "High salt concentration. Leach field with good quality irrigation water. Ensure sub-surface drainage."

        # 3. Organic Carbon (OC)
        if organic_carbon_pct < 0.50:
            oc_status = "Low (<0.50%)"
            oc_advisory = "Organic carbon is deficient. Incorporate 8-10 tonnes/hectare well-decomposed Farmyard Manure (FYM) or 3 tonnes/ha Vermicompost."
        elif organic_carbon_pct <= 0.75:
            oc_status = "Medium (0.50% - 0.75%)"
            oc_advisory = "Moderate organic carbon pool. Apply 4-5 tonnes/hectare FYM during primary land preparation to maintain soil biological activity."
        else:
            oc_status = "High (>0.75%)"
            oc_advisory = "Excellent organic carbon content. Supports high microbial health and moisture retention."

        # 4. Available Nitrogen (N)
        if available_nitrogen < 280.0:
            n_status = "Low (<280 kg/ha)"
            n_advisory = "Soil available nitrogen is low. Increase recommended urea/N-fertilizer application by 25%, split into 3 vegetative doses."
        elif available_nitrogen <= 560.0:
            n_status = "Medium (280 - 560 kg/ha)"
            n_advisory = "Normal nitrogen availability. Follow standard state recommended dose for the target crop."
        else:
            n_status = "High (>560 kg/ha)"
            n_advisory = "High nitrogen. Reduce synthetic nitrogen application by 20-25% to prevent excessive vegetative growth and crop lodging."

        # 5. Available Phosphorus (P)
        if available_phosphorus < 10.0:
            p_status = "Low (<10 kg/ha)"
            p_advisory = "Available phosphorus is deficient. Increase SSP or DAP basal dose by 25%. In acidic soils, use rock phosphate."
        elif available_phosphorus <= 25.0:
            p_status = "Medium (10 - 25 kg/ha)"
            p_advisory = "Medium phosphorus content. Apply 100% recommended basal phosphorus."
        else:
            p_status = "High (>25 kg/ha)"
            p_advisory = "High phosphorus reserves. Basal phosphorus fertilizer can be reduced by 25-30%."

        # 6. Available Potassium (K)
        if available_potassium < 108.0:
            k_status = "Low (<108 kg/ha)"
            k_advisory = "Potassium is low. Apply Muriate of Potash (MOP) to improve disease resistance and tuber/grain filling."
        elif available_potassium <= 280.0:
            k_status = "Medium (108 - 280 kg/ha)"
            k_advisory = "Medium potassium status. Apply standard recommended dose of potash."
        else:
            k_status = "High (>280 kg/ha)"
            k_advisory = "High potassium status. MOP application may be safely reduced by 20%."

        # Compute Overall Fertility Index (Score 0 - 100)
        fertility_score = 0
        # pH contribution (max 20)
        if 6.0 <= ph <= 7.5:
            fertility_score += 20
        elif 5.5 <= ph < 6.0 or 7.5 < ph <= 8.2:
            fertility_score += 14
        else:
            fertility_score += 6

        # EC contribution (max 15)
        if electrical_conductivity < 1.0:
            fertility_score += 15
        elif electrical_conductivity <= 2.0:
            fertility_score += 8
        else:
            fertility_score += 3

        # OC contribution (max 25)
        if organic_carbon_pct >= 0.75:
            fertility_score += 25
        elif organic_carbon_pct >= 0.50:
            fertility_score += 18
        else:
            fertility_score += 10

        # NPK balance contribution (max 40)
        n_pts = 13 if 280 <= available_nitrogen <= 560 else 8
        p_pts = 13 if 10 <= available_phosphorus <= 25 else 8
        k_pts = 14 if 108 <= available_potassium <= 280 else 8
        fertility_score += (n_pts + p_pts + k_pts)

        # Crop Suitability Assessment
        crop_suitability = self._evaluate_crop_suitability(ph, electrical_conductivity, organic_carbon_pct, available_nitrogen)

        return {
            "fertility_index_score": fertility_score,
            "overall_rating": "Optimal Fertility" if fertility_score >= 80 else "Good Fertility - Minor Amelioration" if fertility_score >= 60 else "Moderate / Sub-optimal Fertility",
            "parameters": {
                "ph": {"value": ph, "unit": "scale", "status": ph_status, "guidance": ph_advisory},
                "electrical_conductivity": {"value": electrical_conductivity, "unit": "dS/m", "status": ec_status, "guidance": ec_advisory},
                "organic_carbon": {"value": organic_carbon_pct, "unit": "%", "status": oc_status, "guidance": oc_advisory},
                "available_nitrogen": {"value": available_nitrogen, "unit": "kg/ha", "status": n_status, "guidance": n_advisory},
                "available_phosphorus": {"value": available_phosphorus, "unit": "kg/ha", "status": p_status, "guidance": p_advisory},
                "available_potassium": {"value": available_potassium, "unit": "kg/ha", "status": k_status, "guidance": k_advisory},
            },
            "crop_suitability": crop_suitability,
            "data_provenance": "Government of India Soil Health Card (DAC&FW) Diagnostic Protocols",
            "disclaimer": "Soil amendments should be adapted to local agricultural university recommendations and field conditions."
        }

    def _evaluate_crop_suitability(self, ph: float, ec: float, oc: float, n: float) -> List[Dict[str, Any]]:
        crops = [
            {"crop": "Potato", "optimal_ph": (5.2, 6.8), "min_oc": 0.45, "notes": "Acidic to neutral soil ideal; low scab risk at pH < 6.0."},
            {"crop": "Tomato", "optimal_ph": (6.0, 7.2), "min_oc": 0.50, "notes": "Prefers well-drained loamy soil with neutral pH."},
            {"crop": "Rice (Paddy)", "optimal_ph": (5.0, 7.8), "min_oc": 0.40, "notes": "Highly adaptable to submerged alluvial soils."},
            {"crop": "Maize", "optimal_ph": (5.8, 7.5), "min_oc": 0.50, "notes": "Requires deep fertile soil with good aeration."},
            {"crop": "Wheat", "optimal_ph": (6.0, 7.5), "min_oc": 0.50, "notes": "Best suited to fertile alluvial soils of Gangetic plains."},
            {"crop": "Mustard", "optimal_ph": (6.0, 7.5), "min_oc": 0.45, "notes": "Moderate salt tolerance; prefers light to medium loam."},
            {"crop": "Jute", "optimal_ph": (5.5, 7.0), "min_oc": 0.50, "notes": "Thrives in alluvial Gangetic silt and deltaic tracts."},
        ]

        suitability = []
        for c in crops:
            score = 90
            ph_min, ph_max = c["optimal_ph"]
            if not (ph_min <= ph <= ph_max):
                score -= min(30, int(abs(ph - (ph_min + ph_max) / 2) * 20))
            if oc < c["min_oc"]:
                score -= 15
            if ec > 1.5:
                score -= 20

            score = max(25, min(98, score))
            status = "Highly Suitable" if score >= 80 else "Moderately Suitable" if score >= 60 else "Marginally Suitable"

            suitability.append({
                "crop": c["crop"],
                "suitability_score": score,
                "suitability_status": status,
                "agronomic_notes": c["notes"],
            })

        suitability.sort(key=lambda x: x["suitability_score"], reverse=True)
        return suitability


soil_service = SoilDiagnosticService()
