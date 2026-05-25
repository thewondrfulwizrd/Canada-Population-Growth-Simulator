/**
 * Age-Specific Fertility Rates (ASFR) for Canada
 * Based on 2023-2024 Statistics Canada data
 * 
 * ASFRs are the number of births per woman in each age group
 * Index corresponds to age group:
 * - Index 3: Ages 15-19
 * - Index 4: Ages 20-24
 * - Index 5: Ages 25-29
 * - Index 6: Ages 30-34
 * - Index 7: Ages 35-39
 * - Index 8: Ages 40-44
 * - Index 9: Ages 45-49
 */

let cachedFertilityRates = null;

/**
 * Get baseline age-specific fertility rates
 * Returns array of 21 values (one per age group)
 * Non-reproductive ages have ASFR = 0
 *
 * Baseline TFR: 1.25 (children per woman)
 * Source: Statistics Canada Table 13-10-0418-01, 2024 data
 * (released 2025-09-24). Rates are per-woman per-year.
 */
function getBaselineFertilityRates() {
  // All 21 age groups (0-4, 5-9, ..., 100+)
  const rates = new Array(21).fill(0);

  // Set ASFRs for reproductive ages (15-49)
  // StatsCan publishes these per-1000 women; we use per-woman values.
  // TFR = sum(rates) * 5 = 0.2508 * 5 ≈ 1.25 (matches StatsCan's reported 2024 TFR)
  rates[3] = 0.00400;   // Ages 15-19
  rates[4] = 0.02220;   // Ages 20-24
  rates[5] = 0.06270;   // Ages 25-29 (peak fertility)
  rates[6] = 0.09280;   // Ages 30-34
  rates[7] = 0.05560;   // Ages 35-39
  rates[8] = 0.01260;   // Ages 40-44
  rates[9] = 0.00090;   // Ages 45-49

  // All other age groups (0-14, 50+) remain 0
  // TFR = sum(rates) * 5 = 0.2508 * 5 = 1.254

  return rates;
}

/**
 * Calculate Total Fertility Rate (TFR) from ASFRs
 * TFR = sum of all ASFRs × 5 (since each group is 5-year span)
 * Represents average children per woman
 */
function calculateTFRFromASFR(asfrs) {
  let sum = 0;
  for (let i = 0; i < asfrs.length; i++) {
    sum += asfrs[i];
  }
  // Multiply by 5 because each age group spans 5 years
  return sum * 5;
}

/**
 * Apply fertility adjustment to ASFRs
 * @param {number} fertilityAdjustment - Percentage adjustment (-100 to +100)
 * @returns {Array} Adjusted ASFRs
 */
function applyFertilityAdjustment(baselineASFRs, fertilityAdjustment) {
  const multiplier = 1 + fertilityAdjustment / 100;
  return baselineASFRs.map(asfr => asfr * multiplier);
}

/**
 * Load fertility rates (synchronously return cached or baseline)
 */
export function loadFertilityRates() {
  if (!cachedFertilityRates) {
    cachedFertilityRates = {
      baseline: getBaselineFertilityRates(),
      tfr: calculateTFRFromASFR(getBaselineFertilityRates())
    };
  }
  return cachedFertilityRates;
}

/**
 * Get fertility rates synchronously
 */
export function getFertilityRates() {
  if (!cachedFertilityRates) {
    loadFertilityRates();
  }
  return cachedFertilityRates;
}

/**
 * Get adjusted fertility rates for a given scenario
 * @param {number} fertilityAdjustment - Percentage adjustment (-100 to +100)
 * @returns {Object} { asfrs: Array, tfr: number }
 */
export function getAdjustedFertilityRates(fertilityAdjustment) {
  const baseline = getFertilityRates();
  const adjustedASFRs = applyFertilityAdjustment(baseline.baseline, fertilityAdjustment);
  const adjustedTFR = calculateTFRFromASFR(adjustedASFRs);
  
  return {
    asfrs: adjustedASFRs,
    tfr: adjustedTFR,
    baselineTFR: baseline.tfr
  };
}

/**
 * Calculate births from female population using ASFRs
 * @param {Array} femalePopulation - Female population by age group (21 elements)
 * @param {Array} asfrs - Age-specific fertility rates
 * @returns {number} Total births
 */
export function calculateBirthsFromASFR(femalePopulation, asfrs) {
  let totalBirths = 0;
  
  // For each reproductive age group (3-9: ages 15-49)
  for (let i = 3; i <= 9; i++) {
    const womenInGroup = femalePopulation[i] || 0;
    const birthsFromGroup = womenInGroup * asfrs[i];
    totalBirths += birthsFromGroup;
  }
  
  return Math.round(totalBirths);
}