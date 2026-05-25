/**
 * Mortality rates by age and gender for Canada
 * Rates are per 1,000 population
 *
 * Source: Statistics Canada Table 17-10-0006-01 (deaths by age/sex)
 *         and Table 17-10-0005-01 (population by age/sex).
 *         Rates computed as deaths(2024/2025 fiscal) / population(July 1, 2025).
 *         Released 2026-03-18 (deaths) / 2025-09-24 (population).
 *
 * Age cohorts (21 groups):
 * 0: 0-4, 1: 5-9, 2: 10-14, 3: 15-19, 4: 20-24, 5: 25-29, 6: 30-34, 7: 35-39,
 * 8: 40-44, 9: 45-49, 10: 50-54, 11: 55-59, 12: 60-64, 13: 65-69, 14: 70-74,
 * 15: 75-79, 16: 80-84, 17: 85-89, 18: 90-94, 19: 95-99, 20: 100+
 *
 * Important: the 0-4 cohort rate is the *crude* rate (deaths / population in
 * cohort), which is much lower than the under-1 rate because the 0-4 cohort is
 * mostly ages 1-4. Newborns get the INFANT_MORTALITY_UNDER1 rate separately.
 */

// Under-1 mortality rate per 1,000 live births. Computed from StatsCan
// 17-10-0006-01 "-1 year" deaths over estimated births (~370K), 2024/2025.
// Applied only to newborns; the existing 0-4 cohort uses MORTALITY_RATES[0].
export const INFANT_MORTALITY_UNDER1 = { male: 4.3, female: 3.9 };

// Crude mortality rates (deaths per 1,000 population) by age and sex,
// 2024/2025 fiscal year. Computed from StatsCan tables 17-10-0006-01 and
// 17-10-0005-01.
const MORTALITY_RATES = {
  female: [
    0.24,    // 0-4 years
    0.08,    // 5-9 years
    0.13,    // 10-14 years
    0.28,    // 15-19 years
    0.46,    // 20-24 years
    0.55,    // 25-29 years
    0.69,    // 30-34 years
    0.84,    // 35-39 years
    1.09,    // 40-44 years
    1.55,    // 45-49 years
    2.31,    // 50-54 years
    3.66,    // 55-59 years
    5.76,    // 60-64 years
    8.59,    // 65-69 years
    13.62,   // 70-74 years
    23.05,   // 75-79 years
    40.84,   // 80-84 years
    75.74,   // 85-89 years
    138.95,  // 90-94 years
    227.18,  // 95-99 years
    353.51   // 100+ years
  ],
  male: [
    0.25,    // 0-4 years
    0.10,    // 5-9 years
    0.14,    // 10-14 years
    0.53,    // 15-19 years
    0.81,    // 20-24 years
    1.13,    // 25-29 years
    1.37,    // 30-34 years
    1.63,    // 35-39 years
    1.97,    // 40-44 years
    2.57,    // 45-49 years
    3.92,    // 50-54 years
    6.22,    // 55-59 years
    9.19,    // 60-64 years
    13.67,   // 65-69 years
    20.81,   // 70-74 years
    32.87,   // 75-79 years
    55.53,   // 80-84 years
    99.72,   // 85-89 years
    175.40,  // 90-94 years
    254.69,  // 95-99 years
    372.34   // 100+ years
  ]
};

/**
 * Get mortality rates (always available, no async loading needed)
 */
export function getMortalityRates() {
  return MORTALITY_RATES;
}

/**
 * Load mortality rates (for compatibility with async loading pattern)
 * Returns immediately since data is hardcoded
 */
export function loadMortalityRates() {
  return MORTALITY_RATES;
}

/**
 * Get the age cohort index for a given age
 * @param {number} age - Age in years
 * @returns {number} Cohort index (0-20)
 */
export function getAgeCohortIndex(age) {
  if (age < 5) return 0;
  if (age < 10) return 1;
  if (age < 15) return 2;
  if (age < 20) return 3;
  if (age < 25) return 4;
  if (age < 30) return 5;
  if (age < 35) return 6;
  if (age < 40) return 7;
  if (age < 45) return 8;
  if (age < 50) return 9;
  if (age < 55) return 10;
  if (age < 60) return 11;
  if (age < 65) return 12;
  if (age < 70) return 13;
  if (age < 75) return 14;
  if (age < 80) return 15;
  if (age < 85) return 16;
  if (age < 90) return 17;
  if (age < 95) return 18;
  if (age < 100) return 19;
  return 20; // 100+
}
