/**
 * Cohort-Component Projection Model
 * 
 * CRITICAL: Year-by-year projection with 5-year age groups
 * Each year, 1/5 of each cohort ages to the next group, 4/5 stays
 * 
 * For 0-4 cohort specifically:
 * - 1/5 ages to 5-9 (already handled in aging loop)
 * - 4/5 stays in 0-4
 * - PLUS new births added
 * - Result: 0-4 = (existing 0-4 × 4/5) + new births
 */

import { getPopulationByYear } from './populationHelpers';
import { getMortalityRates, loadMortalityRates, INFANT_MORTALITY_UNDER1 } from './mortalityRates';
import { getMigrationDistribution, loadMigrationDistribution } from './migrationDistribution';
import { getAdjustedFertilityRates, calculateBirthsFromASFR } from './fertilityRates';

// Cache for computed projections to avoid recalculating
let projectionCache = {};

// Canadian sex ratio at birth: ~1.05 males per female (StatsCan)
const MALE_SHARE_AT_BIRTH   = 0.5122;
const FEMALE_SHARE_AT_BIRTH = 0.4878;

/**
 * Convert a crude annual mortality rate (per 1,000) to probability of death
 * within one year, using the standard actuarial conversion q = M / (1 + M/2).
 *
 * Crude rates measure deaths/population (an outcome); probabilities are an
 * input to projection. They are nearly identical at low rates (<0.05) but
 * diverge meaningfully at extreme ages. Without this conversion the model
 * overstates deaths at age 100+ by ~20%.
 */
function crudeToProb(ratePer1000) {
  const M = ratePer1000 / 1000;
  return Math.max(0, Math.min(1, M / (1 + M / 2)));
}

/**
 * Main projection function: applies cohort-component model for ONE YEAR
 * 
 * @param {Object} currentPopulation - { male: Array[21], female: Array[21] }
 * @param {Object} scenarios - { fertility: number, mortality: number, migration: number }
 * @param {Object} data - Full dataset with mortality and migration info
 * @returns {Object} { male: Array[21], female: Array[21], _components: {...} }
 */
export async function projectOneYear(currentPopulation, scenarios) {
  // Ensure data is loaded
  loadMortalityRates();
  await loadMigrationDistribution();

  const mortalityRates = getMortalityRates();
  const migrationDist = getMigrationDistribution();
  const fertilityRates = getAdjustedFertilityRates(scenarios.fertility);

  const baseMaleRates = mortalityRates.male;      // Already in per-1000 format
  const baseFemaleRates = mortalityRates.female;  // Already in per-1000 format
  const adjustedASFRs = fertilityRates.asfrs;    // Age-specific fertility rates

  // Constants for demographic model
  const BASELINE_NET_MIGRATION = 400000; // Annual net migration
  const COHORT_WIDTH = 5; // Each age group spans 5 years

  // Scenario adjustments
  const mortalityMultiplier = 1 + scenarios.mortality / 100;
  const migrationMultiplier = 1 + scenarios.migration / 100;

  // Calculate adjusted net migration
  const adjustedNetMigration = Math.round(BASELINE_NET_MIGRATION * migrationMultiplier);

  // ============================================
  // STEP 1: Calculate deaths for each cohort
  // ============================================
  const deathsByAgeGender = new Array(21).fill(0).map(() => ({ male: 0, female: 0 }));
  let totalDeaths = 0;
  let totalPopulation = 0;

  for (let i = 0; i < 21; i++) {
    const malePop = currentPopulation.male[i] || 0;
    const femalePop = currentPopulation.female[i] || 0;
    const cohortPop = malePop + femalePop;

    // CRITICAL: Use age-specific base rate for THIS cohort
    const baseMaleMortalityPer1000 = baseMaleRates[i] || 8.0;
    const baseFemaleMortalityPer1000 = baseFemaleRates[i] || 8.0;

    // Apply scenario slider to each rate independently
    const adjustedMaleMortalityPer1000 = baseMaleMortalityPer1000 * mortalityMultiplier;
    const adjustedFemaleMortalityPer1000 = baseFemaleMortalityPer1000 * mortalityMultiplier;

    // Convert crude rate (M) to probability of death (q) via standard
    // actuarial conversion. Negligible difference at low rates; corrects
    // ~20% overstatement of deaths at the 100+ cohort.
    const maleMortalityProp = crudeToProb(adjustedMaleMortalityPer1000);
    const femaleMortalityProp = crudeToProb(adjustedFemaleMortalityPer1000);

    // Calculate deaths
    const maleDeaths = Math.round(malePop * maleMortalityProp);
    const femaleDeaths = Math.round(femalePop * femaleMortalityProp);

    deathsByAgeGender[i] = { male: maleDeaths, female: femaleDeaths };
    totalDeaths += maleDeaths + femaleDeaths;
    totalPopulation += cohortPop;
  }

  // ============================================
  // STEP 2: Calculate survivors after mortality
  // ============================================
  const survivors = new Array(21).fill(0).map(() => ({ male: 0, female: 0 }));
  for (let i = 0; i < 21; i++) {
    const malePop = currentPopulation.male[i] || 0;
    const femalePop = currentPopulation.female[i] || 0;
    survivors[i].male = malePop - deathsByAgeGender[i].male;
    survivors[i].female = femalePop - deathsByAgeGender[i].female;
  }

  // ============================================
  // STEP 3: Age cohorts forward (1/5 per year)
  // ============================================
  const projectedFemale = new Array(21).fill(0);
  const projectedMale = new Array(21).fill(0);

  // Age groups 1-19: Each receives 1/5 from younger + keeps 4/5 of own
  for (let i = 1; i < 20; i++) {
    const inflowFemale = (survivors[i - 1].female || 0) / COHORT_WIDTH;
    const stayingFemale = (survivors[i].female * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
    projectedFemale[i] = inflowFemale + stayingFemale;

    const inflowMale = (survivors[i - 1].male || 0) / COHORT_WIDTH;
    const stayingMale = (survivors[i].male * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
    projectedMale[i] = inflowMale + stayingMale;
  }

  // Age group 20 (100+): Receives 1/5 from 95-99 + keeps all own survivors
  const inflow100Female = (survivors[19].female || 0) / COHORT_WIDTH;
  const staying100Female = survivors[20].female || 0;
  projectedFemale[20] = inflow100Female + staying100Female;

  const inflow100Male = (survivors[19].male || 0) / COHORT_WIDTH;
  const staying100Male = survivors[20].male || 0;
  projectedMale[20] = inflow100Male + staying100Male;

  // ============================================
  // STEP 4: Calculate births
  // ============================================
  // Use MID-YEAR female population (average of start-of-year stock and
  // post-mortality survivors). Conventional in cohort-component models;
  // start-of-year understates by ~0.5% in a growing population.
  const midyearFemale = currentPopulation.female.map(
    (v, i) => (v + (survivors[i].female || 0)) / 2
  );
  const births = calculateBirthsFromASFR(midyearFemale, adjustedASFRs);

  // Apply UNDER-1 mortality to newborns specifically. The 0-4 cohort rate
  // in MORTALITY_RATES is a 5-year weighted average; newborns face the
  // much higher first-year rate.
  const infantMortalityMale   = crudeToProb(INFANT_MORTALITY_UNDER1.male   * mortalityMultiplier);
  const infantMortalityFemale = crudeToProb(INFANT_MORTALITY_UNDER1.female * mortalityMultiplier);

  // Canada SRB ≈ 1.05 → male share 0.5122, female share 0.4878
  const maleInfantSurvivors   = Math.round(births * MALE_SHARE_AT_BIRTH   * (1 - infantMortalityMale));
  const femaleInfantSurvivors = Math.round(births * FEMALE_SHARE_AT_BIRTH * (1 - infantMortalityFemale));

  // ============================================
  // STEP 5: Age group 0-4 SPECIAL CASE
  // ============================================
  // CRITICAL FIX: 0-4 cohort keeps 4/5 of existing + adds births
  // This is because:
  // - 1/5 of 0-4 already aged to 5-9 (handled above)
  // - 4/5 of 0-4 stays (ages 0-3 become 1-4)
  // - New births become new age 0
  // Result: 0-4 = (existing survivors × 4/5) + new births
  
  const staying0to4Female = (survivors[0].female * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
  const staying0to4Male = (survivors[0].male * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
  
  projectedFemale[0] = staying0to4Female + femaleInfantSurvivors;
  projectedMale[0] = staying0to4Male + maleInfantSurvivors;


  // ============================================
  // STEP 6: Add migration
  // ============================================
  // Migrants entering during the year are exposed to ~½ year of mortality.
  // Multiply each age cohort's migration count by (1 - 0.5 * q_age).
  // Effect is small (<0.3% of total migration); larger for elderly migrants.
  const halfYearSurvivalMale = baseMaleRates.map(
    r => 1 - 0.5 * crudeToProb(r * mortalityMultiplier)
  );
  const halfYearSurvivalFemale = baseFemaleRates.map(
    r => 1 - 0.5 * crudeToProb(r * mortalityMultiplier)
  );

  const maleMigration = migrationDist.male.map(
    (share, i) => Math.round(adjustedNetMigration * share * halfYearSurvivalMale[i])
  );
  const femaleMigration = migrationDist.female.map(
    (share, i) => Math.round(adjustedNetMigration * share * halfYearSurvivalFemale[i])
  );

  // Within-year migrant deaths = planned net inflow minus actual added to stock.
  // Used by the stats table so births - all_deaths + net_migration = pop change
  // remains an exact identity. Clamped at 0 to avoid noise when net is small or
  // negative (the half-year approximation is only meaningful for positive net).
  const totalMigrantsAdded =
    maleMigration.reduce((s, v) => s + v, 0) +
    femaleMigration.reduce((s, v) => s + v, 0);
  const migrantDeaths = Math.max(0, adjustedNetMigration - totalMigrantsAdded);

  // Add migration to projected populations
  const finalMale = projectedMale.map((pop, i) => Math.max(0, pop + maleMigration[i]));
  const finalFemale = projectedFemale.map((pop, i) => Math.max(0, pop + femaleMigration[i]));

  return {
    male: finalMale,
    female: finalFemale,
    // Include component details for analysis
    _components: {
      births,
      maleInfantSurvivors,
      femaleInfantSurvivors,
      deaths: totalDeaths,           // deaths in existing population (Step 1)
      migrantDeaths,                 // within-year deaths of new migrants (Step 6)
      adjustedTFR: fertilityRates.tfr,
      adjustedNetMigration,
      adjustedMortalityMultiplier: mortalityMultiplier,
      globalMortalityRate: totalPopulation > 0 ? (totalDeaths / totalPopulation) * 1000 : 0
    }
  };
}

/**
 * Project forward from a given year using cohort-component model
 * @param {Object} data - Full dataset
 * @param {Object} scenarios - Scenario parameters
 * @param {number} targetYear - Year to project to
 * @param {number} baseYear - Starting year (typically 2025)
 * @returns {Object} Population for target year
 */
export async function projectToYear(data, scenarios, targetYear, baseYear = 2025) {
  // Generate cache key
  const cacheKey = `${targetYear}_${JSON.stringify(scenarios)}`;
  if (projectionCache[cacheKey]) {
    return projectionCache[cacheKey];
  }

  let currentPop = getPopulationByYear(data, baseYear);
  if (!currentPop) {
    console.error(`Cannot find base population for year ${baseYear}`);
    return null;
  }

  // Project year by year from base to target
  for (let year = baseYear + 1; year <= targetYear; year++) {
    currentPop = await projectOneYear(currentPop, scenarios);
  }

  projectionCache[cacheKey] = currentPop;
  return currentPop;
}

/**
 * Clear projection cache (call when scenarios change significantly)
 */
export function clearProjectionCache() {
  projectionCache = {};
}

/**
 * Calculate global mortality rate from population and scenarios
 * @param {Object} population - { male: Array, female: Array }
 * @param {Object} scenarios - Scenario parameters
 * @returns {number} Global mortality rate per 1000 population
 */
export async function calculateGlobalMortalityRate(population, scenarios) {
  loadMortalityRates();
  const mortalityRates = getMortalityRates();

  const mortalityMultiplier = 1 + scenarios.mortality / 100;

  let totalDeaths = 0;
  let totalPopulation = 0;

  // Calculate deaths using age-specific rates × scenario multiplier
  for (let i = 0; i < 21; i++) {
    const malePop = population.male[i] || 0;
    const femalePop = population.female[i] || 0;

    // CRITICAL: Use age-specific base rates, not global average
    const baseMaleMortalityPer1000 = (mortalityRates.male[i] || 8.0);
    const baseFemaleMortalityPer1000 = (mortalityRates.female[i] || 8.0);

    // Apply scenario adjustment
    const adjustedMaleMortalityPer1000 = baseMaleMortalityPer1000 * mortalityMultiplier;
    const adjustedFemaleMortalityPer1000 = baseFemaleMortalityPer1000 * mortalityMultiplier;

    // Match the M→q conversion used in projectOneYear for consistency
    const maleMortalityProp = crudeToProb(adjustedMaleMortalityPer1000);
    const femaleMortalityProp = crudeToProb(adjustedFemaleMortalityPer1000);

    totalDeaths += Math.round(malePop * maleMortalityProp);
    totalDeaths += Math.round(femalePop * femaleMortalityProp);

    totalPopulation += malePop + femalePop;
  }

  // Global mortality rate per 1000
  return totalPopulation > 0 ? (totalDeaths / totalPopulation) * 1000 : 0;
}