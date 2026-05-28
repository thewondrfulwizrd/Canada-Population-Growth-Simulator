import { getPopulationByYear, getYearType } from './populationHelpers';
import { projectToYear, calculateGlobalMortalityRate, clearProjectionCache } from './cohortComponentProjection';

/**
 * Apply scenario adjustments to population data using cohort-component model
 * 
 * For observed years (≤2025): Returns actual data
 * For projected years (≥2026): Uses cohort-component projection with:
 *   - Age-specific mortality rates from 2023 baseline
 *   - Age-gender migration distributions from 2024/2025
 *   - Fertility-driven births
 * 
 * @param {Object} data - Full dataset with observed and projected populations
 * @param {Object} scenarios - { fertility: number, mortality: number, migration: number }
 * @param {number} year - Year to apply scenarios to
 * @returns {Object} { male: Array, female: Array } - Adjusted population
 */
export async function applyScenarios(data, scenarios, year, migrationWeights = null) {
  const yearType = getYearType(data, year);

  // Don't modify historical data
  if (yearType === 'observed') {
    return getPopulationByYear(data, year);
  }

  // For projected years, use cohort-component model
  const projected = await projectToYear(data, scenarios, year, 2025, migrationWeights);
  
  if (!projected) {
    console.warn(`Failed to project population for year ${year}`);
    return { male: [], female: [] };
  }
  
  return projected;
}

/**
 * Calculate the impact of scenarios on total population
 * Useful for showing users how their choices affect population growth
 * 
 * @param {Object} data - Full dataset
 * @param {Object} scenarios - Scenario adjustments
 * @param {number} year - Year to analyze
 * @returns {Object} Impact analysis
 */
export async function analyzeScenarioImpact(data, scenarios, year) {
  const baseline = getPopulationByYear(data, year);
  const adjusted = await applyScenarios(data, scenarios, year);
  
  if (!baseline || !adjusted) return null;
  
  const baselineMale = baseline.male.reduce((sum, v) => sum + v, 0);
  const baselineFemale = baseline.female.reduce((sum, v) => sum + v, 0);
  const baselineTotal = baselineMale + baselineFemale;
  
  const adjustedMale = adjusted.male.reduce((sum, v) => sum + v, 0);
  const adjustedFemale = adjusted.female.reduce((sum, v) => sum + v, 0);
  const adjustedTotal = adjustedMale + adjustedFemale;
  
  const diff = adjustedTotal - baselineTotal;
  const pctChange = baselineTotal > 0 ? ((diff / baselineTotal) * 100) : 0;
  
  return {
    baseline: baselineTotal,
    adjusted: adjustedTotal,
    difference: diff,
    percentChange: pctChange.toFixed(2)
  };
}

/**
 * Get the global mortality rate for current scenario
 * @param {Object} population - Current population by age/gender
 * @param {Object} scenarios - Scenario parameters
 * @returns {number} Mortality rate per 1000 population
 */
export async function getGlobalMortalityRate(population, scenarios) {
  return await calculateGlobalMortalityRate(population, scenarios);
}

/**
 * Clear cached projections when scenarios change
 */
export function onScenariosChanged() {
  clearProjectionCache();
}
