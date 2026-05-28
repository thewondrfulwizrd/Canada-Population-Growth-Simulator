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
 * Fertility trajectory: TFR drifts from 1.25 (2025) toward 1.45 by 2050,
 * then constant. This mirrors the partial-recovery assumption used in
 * StatsCan's M-series medium-growth scenarios; without it, projections
 * extrapolate today's record-low TFR for 75 years.
 *
 * Returns: multiplier to apply to the 2025-baseline ASFRs.
 */
export function fertilityTrajectoryMultiplier(year) {
  if (year <= BASE_YEAR) return 1.0;
  const targetYear = 2050;
  const startTFR = 1.25;
  const endTFR = 1.45;
  if (year >= targetYear) return endTFR / startTFR;
  const t = (year - BASE_YEAR) / (targetYear - BASE_YEAR);
  return (startTFR + t * (endTFR - startTFR)) / startTFR;
}

/**
 * Mortality trajectory: rates decline ~0.7%/year through 2075, then constant.
 * Reflects continued life-expectancy gains decelerating as gains compress.
 * Roughly equivalent to +1 year of life expectancy per decade slowing over time.
 *
 * Returns: multiplier to apply to the 2025-baseline mortality rates.
 */
export function mortalityTrajectoryMultiplier(year) {
  if (year <= BASE_YEAR) return 1.0;
  const cap = 2075;
  const rate = 0.007;
  const yearsApplied = Math.min(year, cap) - BASE_YEAR;
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
 * Net migration = PR + Net NPR change − Net emigration. Trajectory below
 * blends continued NPR drawdown (steepest in 2026) with steady-state PR.
 * Beyond 2030 stabilises near 300K — PR target ~365K minus emigration ~65K.
 *
 * For 2025 and earlier, the model uses observed historical data, so this
 * function only matters for the projected years.
 */
const MIGRATION_TRAJECTORY = {
  2026: -120000,  // Aggressive NPR drawdown (~-450K) + PR (~380K) - emig (~65K)
  2027:  175000,  // NPR drawdown easing (~-140K) + PR (~365K) - emig (~65K)
  2028:  280000,  // NPR roughly stable + PR (~365K) - emig (~65K)
  2029:  300000,
  2030:  300000,
};

export function migrationTrajectoryBaseline(year) {
  if (year <= BASE_YEAR) return 400000; // not used; observed data is used for historical
  if (year >= 2030) return 300000;
  return MIGRATION_TRAJECTORY[year] ?? 300000;
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
