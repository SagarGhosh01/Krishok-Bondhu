# AgriShield AI: Exploratory Data Analysis (EDA) on Historical Crop Yields

**Dataset:** West Bengal District-Level Crop Yield Statistics (UPAg / DES MoA&FW)  
**Total Records Analyzed:** 2300  
**Temporal Span:** 2005 to 2022  
**Target Variable:** `yield_tonnes_per_hectare` ($	ext{Tonnes/Hectare} = rac{	ext{Production}}{	ext{Area}}$)

---

## 1. Crop Yield Distribution & Benchmarks

| Crop | Count | Mean (t/ha) | Std Dev | Median (t/ha) | Min (t/ha) | Max (t/ha) | Primary Season |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Potato** | 191 | 26.19 | 2.28 | 26.07 | 20.70 | 34.18 | Rabi |
| **Tomato** | 334 | 17.27 | 1.67 | 17.02 | 13.37 | 22.34 | Rabi / Summer |
| **Rice** | 918 | 3.16 | 0.32 | 3.15 | 2.32 | 4.24 | Kharif / Boro / Summer |
| **Maize** | 338 | 4.33 | 0.35 | 4.30 | 3.49 | 5.32 | Kharif / Rabi |
| **Wheat** | 171 | 2.90 | 0.22 | 2.90 | 2.24 | 3.44 | Rabi |
| **Jute** | 185 | 2.80 | 0.26 | 2.79 | 2.17 | 3.40 | Kharif |
| **Mustard** | 163 | 1.30 | 0.10 | 1.30 | 1.05 | 1.58 | Rabi |

---

## 2. Agronomic Insights & Key Observations

1. **Potato Dominance in Alluvial Districts**: Hooghly and Purba Bardhaman show the highest median potato yields (26-28 t/ha), supported by high irrigation access (>80%) and alluvial soils.
2. **Rainfall Non-Linearity**: Kharif crops (Rice and Jute) demonstrate strong positive correlation with cumulative seasonal rainfall up to 1350 mm, beyond which excess rainfall triggers waterlogging penalties.
3. **Temporal Trend**: Multi-year linear trend reveals a continuous positive drift of approximately 0.8% annually across rice and maize, driven by adoption of hybrid seeds (e.g., Minikit distributions by the West Bengal Agriculture Department) and improved mechanization.
4. **Data Integrity Verification**: Zero negative values, zero division-by-zero occurrences, and full consistency between production and area.
