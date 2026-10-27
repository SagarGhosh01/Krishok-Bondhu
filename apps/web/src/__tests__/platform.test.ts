import { describe, it, expect, vi } from "vitest";
import {
  predictYield,
  fetchWeatherCurrent,
  fetchMandiPrices,
  analyzeSoil,
  fetchGovernmentSchemes,
  fetchFarmerReport,
} from "../services/api";

describe("AgriShield Full-Platform Client Services", () => {
  it("exports valid API methods for all 6 decision modules", () => {
    expect(typeof predictYield).toBe("function");
    expect(typeof fetchWeatherCurrent).toBe("function");
    expect(typeof fetchMandiPrices).toBe("function");
    expect(typeof analyzeSoil).toBe("function");
    expect(typeof fetchGovernmentSchemes).toBe("function");
    expect(typeof fetchFarmerReport).toBe("function");
  });

  it("handles mocked yield prediction responses correctly", async () => {
    const mockResponse = {
      crop: "Potato",
      district: "Purba Bardhaman",
      predicted_yield_tonnes_per_hectare: 25.8,
      predicted_production_tonnes: 64.5,
      prediction_interval_80: {
        lower_bound_t_ha: 23.4,
        upper_bound_t_ha: 28.2,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const res = await predictYield({
      district: "Purba Bardhaman",
      crop: "Potato",
      season: "Rabi",
      area_hectares: 2.5,
    });

    expect(res.predicted_yield_tonnes_per_hectare).toBe(25.8);
    expect(res.predicted_production_tonnes).toBe(64.5);
    expect(res.prediction_interval_80.lower_bound_t_ha).toBe(23.4);
  });

  it("handles mocked soil analysis evaluation", async () => {
    const mockSoilRes = {
      fertility_index_score: 82,
      overall_rating: "Optimal Fertility",
      parameters: {
        ph: { value: 6.5, status: "Neutral (Optimal)" },
      },
      crop_suitability: [
        { crop: "Potato", suitability_score: 95, suitability_status: "Highly Suitable" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSoilRes,
    } as Response);

    const res = await analyzeSoil({
      ph: 6.5,
      electrical_conductivity: 0.4,
      organic_carbon_pct: 0.78,
      available_nitrogen: 340,
      available_phosphorus: 18,
      available_potassium: 210,
    });

    expect(res.fertility_index_score).toBe(82);
    expect(res.overall_rating).toBe("Optimal Fertility");
    expect(res.crop_suitability[0].crop).toBe("Potato");
  });

  it("handles government schemes lookup in multiple languages", async () => {
    const mockSchemes = {
      count: 2,
      schemes: [
        { id: "BSB_WB", title: "Bangla Shasya Bima", category: "Crop Insurance" },
        { id: "PM_KISAN", title: "PM-KISAN", category: "Income Support" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSchemes,
    } as Response);

    const res = await fetchGovernmentSchemes("All", "", "en");
    expect(res.schemes.length).toBe(2);
    expect(res.schemes[0].id).toBe("BSB_WB");
  });
});
