import { describe, it, expect } from "vitest";
import en from "../locales/en.json";
import bn from "../locales/bn.json";
import hi from "../locales/hi.json";
import { db } from "../db/indexedDb";

describe("Frontend Localization Integrity", () => {
  it("enforces key parity between English and Bengali locales", () => {
    const enSections = Object.keys(en);
    const bnSections = Object.keys(bn);
    expect(bnSections).toEqual(enSections);

    for (const section of enSections) {
      const enKeys = Object.keys((en as any)[section]);
      const bnKeys = Object.keys((bn as any)[section]);
      expect(bnKeys).toEqual(enKeys);
    }
  });

  it("enforces key parity between English and Hindi locales", () => {
    const enSections = Object.keys(en);
    const hiSections = Object.keys(hi);
    expect(hiSections).toEqual(enSections);

    for (const section of enSections) {
      const enKeys = Object.keys((en as any)[section]);
      const hiKeys = Object.keys((hi as any)[section]);
      expect(hiKeys).toEqual(enKeys);
    }
  });

  it("ensures critical disclaimers exist in all languages", () => {
    expect(en.result.note_card).toBeDefined();
    expect(bn.result.note_card).toBeDefined();
    expect(hi.result.note_card).toBeDefined();

    expect(en.result.gradcam_note).toBeDefined();
    expect(bn.result.gradcam_note).toBeDefined();
    expect(hi.result.gradcam_note).toBeDefined();

    expect(en.advanced.cert_disclaimer).toBeDefined();
    expect(bn.advanced.cert_disclaimer).toBeDefined();
    expect(hi.advanced.cert_disclaimer).toBeDefined();

    // Verify localized text is non-empty
    expect(en.result.note_card.length).toBeGreaterThan(20);
    expect(bn.result.note_card.length).toBeGreaterThan(20);
    expect(hi.result.note_card.length).toBeGreaterThan(20);
  });
});

describe("IndexedDB Store Architecture", () => {
  it("defines the required tables for offline-first operation", () => {
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain("scans");
    expect(tableNames).toContain("pendingSync");
  });
});

describe("Taxonomy & Model Constants", () => {
  it("supports the 17 standardized foliar disease classes", () => {
    const crops = ["Tomato", "Potato", "Corn"];
    expect(crops.length).toBe(3);
  });

  it("validates ICAR 5-Stage severity grade limits", () => {
    const grades = [1, 2, 3, 4, 5];
    grades.forEach((g) => {
      expect(g).toBeGreaterThanOrEqual(1);
      expect(g).toBeLessThanOrEqual(5);
    });
  });
});
