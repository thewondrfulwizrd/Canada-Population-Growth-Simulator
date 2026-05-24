/**
 * Mortality rates by age and gender from Statistics Canada 2023 data
 * Rates are per 1,000 population
 * Source: StatsCan Table 13-10-0380-01 (crude mortality rates by age/sex, 2023)
 *         90-94, 95-99, 100+ from Table 13-10-0114-01 (complete life tables, 2023)
 *
 * Age cohorts (21 groups):
 * 0: 0-4, 1: 5-9, 2: 10-14, 3: 15-19, 4: 20-24, 5: 25-29, 6: 30-34, 7: 35-39,
 * 8: 40-44, 9: 45-49, 10: 50-54, 11: 55-59, 12: 60-64, 13: 65-69, 14: 70-74,
 * 15: 75-79, 16: 80-84, 17: 85-89, 18: 90-94, 19: 95-99, 20: 100+
 *
 * Note: 0-4 rate is a weighted average of under-1 and 1-4 crude rates
 * (1/5 under-1 + 4/5 ages 1-4, reflecting cohort composition).
 */

// Base mortality rates from Statistics Canada 2023 (per 1,000 population)
const MORTALITY_RATES = {
  female: [
    1.00,        // 0-4 years  (under-1: 4.2, ages 1-4: 0.2 → weighted 1/5×4.2 + 4/5×0.2 = 1.00)
    0.10,        // 5-9 years
    0.10,        // 10-14 years
    0.30,        // 15-19 years
    0.40,        // 20-24 years
    0.60,        // 25-29 years
    0.70,        // 30-34 years
    0.90,        // 35-39 years
    1.10,        // 40-44 years
    1.60,        // 45-49 years
    2.30,        // 50-54 years
    3.60,        // 55-59 years
    5.60,        // 60-64 years
    8.80,        // 65-69 years
    13.90,       // 70-74 years
    23.80,       // 75-79 years
    41.80,       // 80-84 years
    77.90,       // 85-89 years
    143.639368,  // 90-94 years  (from life table)
    241.758242,  // 95-99 years  (from life table)
    351.543309   // 100+ years   (from life table)
  ],
  male: [
    1.18,        // 0-4 years  (under-1: 5.1, ages 1-4: 0.2 → weighted 1/5×5.1 + 4/5×0.2 = 1.18)
    0.10,        // 5-9 years
    0.10,        // 10-14 years
    0.50,        // 15-19 years
    0.70,        // 20-24 years
    1.10,        // 25-29 years
    1.40,        // 30-34 years
    1.70,        // 35-39 years
    2.10,        // 40-44 years
    2.60,        // 45-49 years
    4.00,        // 50-54 years
    6.10,        // 55-59 years
    9.00,        // 60-64 years
    13.70,       // 65-69 years
    21.00,       // 70-74 years
    33.50,       // 75-79 years
    58.40,       // 80-84 years
    106.20,      // 85-89 years
    185.467822,  // 90-94 years  (from life table)
    278.554094,  // 95-99 years  (from life table)
    401.356994   // 100+ years   (from life table)
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
