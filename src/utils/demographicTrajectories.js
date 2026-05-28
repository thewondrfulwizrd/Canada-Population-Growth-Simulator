/**
 * Long-term demographic trajectories for the projection baseline.
 *
 * Without these, the model would hold 2024/2025 rates constant through 2100,
 * which systematically understates births (fertility recovery is not modelled)
 * and overstates deaths (continued life-expectancy gains are not modelled).
 *
 * Each function returns either a multiplier (applied to the 2025-baseline rate)
 * or, for migration, an absolute count. The user's slider adjustments stack
 * on top: e.g., "+10% fertility" at year 2050 produces TFR = 1.45 × 1.10.
 *
 * These are deliberately simple linear/exponential trajectories — not a full
 * scenario library. They're meant to give a defensible "no scenario change"
 * projection rather than a single fixed point.
 */

const BASE_YEAR = 2025;

/**
 * Fertility trajectory: TFR drifts from 1.25 (2025) toward 1.30 by 2050,
 * then constant. This aligns with Statistics Canada's medium-growth scenario;
 * without it, projections extrapolate today's record-low TFR for 75 years.
 *
 * Returns: multiplier to apply to the 2025-baseline ASFRs.
 */
export function fertilityTrajectoryMultiplier(year) {
  if (year <= BASE_YEAR) return 1.0;
  const targetYear = 2050;
  const startTFR = 1.25;
  const endTFR = 1.30;
  if (year >= targetYear) return endTFR / startTFR;
  const t = (year - BASE_YEAR) / (targetYear - BASE_YEAR);
  return (startTFR + t * (endTFR - startTFR)) / startTFR;
}

/**
 * Mortality trajectory multiplier — age-stratified.
 *
 * Mortality improvements decelerate at extreme old age: clinical and actuarial
 * evidence shows gains at 90-100+ are roughly half or less of gains at 65-75.
 * Applying a uniform improvement rate across all ages overstates centenarian
 * survivorship by 30-60% over a 50-year horizon.
 *
 * Improvement rates used:
 *   Ages 0-79  (cohort indices 0-15):  0.70%/yr  — full observed improvement
 *   Ages 80-89 (cohort indices 16-17): 0.35%/yr  — half rate (deceleration begins)
 *   Ages 90+   (cohort indices 18-20): 0.175%/yr — quarter rate (biological limits)
 *
 * All rates are capped at 2075; improvements plateau thereafter.
 *
 * @param {number} year        - Projection year
 * @param {number} ageIndex    - Cohort index 0-20 (0=0-4, 20=100+)
 * @returns {number} Multiplier to apply to 2025-baseline age-specific mortality rate
 */
export function mortalityTrajectoryMultiplier(year, ageIndex = 0) {
  if (year <= BASE_YEAR) return 1.0;
  const cap = 2075;
  const yearsApplied = Math.min(year, cap) - BASE_YEAR;

  // Taper improvement rate for the oldest age groups
  let rate;
  if (ageIndex <= 15) {
    rate = 0.007;   // 0-79: full 0.70%/yr
  } else if (ageIndex <= 17) {
    rate = 0.0035;  // 80-89: half 0.35%/yr
  } else {
    rate = 0.00175; // 90+:  quarter 0.175%/yr
  }

  return Math.pow(1 - rate, yearsApplied);
}

/**
 * Migration trajectory (absolute net migration in persons).
 *
 * Anchored to observed Q1 2026 conditions:
 *   - Non-permanent resident stock fell from 3.15M (Oct 2024) to 2.68M
 *     (Jan 2026) — a 470K reduction in 5 quarters.
 *   - Federal policy targets NPR ≤ 5% of population (~2.1M today, ~2.2M by
 *     2030). Another ~500K reduction needed, spread over 24-36 months.
 *   - IRCC Levels Plan: PR admissions 395K (2025) → 380K (2026) → 365K (2027).
 *   - Annual emigration runs ~65K (StatsCan Net emigration).
 *
 * Net migration trajectory:
 *   2026: large negative — aggressive NPR stock drawdown overlaps with PR admissions & emigration
 *   2027–2029: recovery as NPR drawdown eases and PR admissions dominate
 *   2030+: steady-state 400K/yr (matches the UI "Annual PR Target" baseline)
 *
 * The 400K long-run figure is the headline PR admissions target. Emigration (~65K/yr)
 * is implicitly netted out via the migration distribution data, which uses observed
 * net-migration flows (immigrants + NPR change − emigrants) from StatsCan.
 *
 * For 2025 and earlier, the model uses observed historical data, so this
 * function only matters for the projected years.
 */
const MIGRATION_TRAJECTORY = {
  2026: -120000,  // Aggressive NPR drawdown (~-450K) + PR (~380K) - emig (~65K)
  2027:  175000,  // NPR drawdown easing (~-140K) + PR (~365K) - emig (~65K)
  2028:  280000,  // NPR roughly stable + PR (~365K) - emig (~65K)
  2029:  350000,  // Transition toward steady-state; NPR stock stabilised
  2030:  400000,  // Steady-state: matches UI "Annual PR Target" baseline
};

export function migrationTrajectoryBaseline(year) {
  if (year <= BASE_YEAR) return 400000; // not used; observed data is used for historical
  if (year >= 2030) return 400000;
  return MIGRATION_TRAJECTORY[year] ?? 400000;
}

/**
 * Compute display values for the UI (NOT used by the projection engine).
 *
 * netMigration is intentionally fixed at 400K here — the near-term NPR
 * drawdown patch is applied transparently by the projection engine via
 * migrationTrajectoryBaseline(year) and should not appear in the scenario
 * slider UI.
 */
export function getTrajectoryBaselines(year) {
  return {
    tfr: 1.25 * fertilityTrajectoryMultiplier(year),
    mortalityMultiplier: mortalityTrajectoryMultiplier(year),
    netMigration: 400_000, // UI reference only — model uses migrationTrajectoryBaseline()
  };
}
