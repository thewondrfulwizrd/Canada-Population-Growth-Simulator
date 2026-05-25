import { getTrajectoryBaselines } from '../utils/demographicTrajectories';
import { InfoTooltip } from './InfoTooltip';
import './ScenarioControls.css';

const HISTORICAL_MIGRATION = 400000; // Displayed for historical years (≤2025)

const FERTILITY_TOOLTIP =
  'Baseline TFR is projected to drift from 1.25 (2025) up to 1.45 by 2050, reflecting partial recovery — held constant after. Slider adjusts this trajectory.';

const MORTALITY_TOOLTIP =
  'Baseline assumes age-specific mortality rates decline ~0.7%/year through 2075 as life expectancy continues to rise, then constant. Slider adjusts the trajectory.';

const MIGRATION_TOOLTIP =
  'Baseline reflects continued NPR drawdown through 2027 (federal target: NPR ≤ 5% of population), settling to ~300K/year long-term. Slider adjusts the year baseline.';

/**
 * ScenarioControls component
 *
 * Each slider displays a year-dependent baseline pulled from the long-term
 * trajectory functions. The user's slider adjustment stacks on top of that
 * baseline (e.g. "+10% fertility" at year 2050 → TFR 1.45 × 1.10).
 */
export function ScenarioControls({
  scenarios,
  onScenarioChange,
  onReset,
  isHistorical,
  baselineMortality,
  selectedYear,
}) {
  // Year-dependent trajectory baselines
  const traj = getTrajectoryBaselines(selectedYear ?? 2025);
  const baselineTFR = traj.tfr;
  // Mortality: combine the cohort-weighted baseline (computed from the actual
  // year's population by PopulationPyramid) with the trajectory multiplier.
  const displayedBaselineMortality =
    (baselineMortality || 7.5) * traj.mortalityMultiplier;
  // Migration: historical years show the long-run 400K reference; projected
  // years show the trajectory baseline.
  const baselineMigration = isHistorical ? HISTORICAL_MIGRATION : traj.netMigration;

  // Adjusted baseline figures (after slider)
  const adjustedFertility = baselineTFR * (1 + scenarios.fertility / 100);
  const adjustedMortality = displayedBaselineMortality * (1 + scenarios.mortality / 100);
  const adjustedMigration = Math.round(baselineMigration * (1 + scenarios.migration / 100));

  return (
    <div className="scenario-controls">
      <div className="scenario-header">
        <h3>📊 Scenario Builder</h3>
        <button className="reset-button" onClick={onReset}>
          Reset to Baseline
        </button>
      </div>

      <div className="scenario-sliders">
        {/* Fertility Rate Slider */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">👶</span>
              Fertility Rate (TFR)
              <InfoTooltip text={FERTILITY_TOOLTIP} />
            </label>
            <span className={`scenario-value ${scenarios.fertility === 0 ? 'baseline' : scenarios.fertility > 0 ? 'increase' : 'decrease'}`}>
              {scenarios.fertility > 0 ? '+' : ''}{scenarios.fertility}%
            </span>
          </div>

          <input
            type="range"
            min="-50"
            max="50"
            value={scenarios.fertility}
            step="5"
            onChange={(e) => onScenarioChange('fertility', parseInt(e.target.value))}
            className="slider"
          />

          <div className="scenario-markers">
            <span>-50%</span>
            <span className="baseline-marker">0%</span>
            <span>+50%</span>
          </div>

          <div className="baseline-display">
            <div className="baseline-item">
              <span className="baseline-label">Current TFR</span>
              <span className="baseline-value">{adjustedFertility.toFixed(2)}</span>
            </div>
            <div className="baseline-item">
              <span className="baseline-label">Baseline ({selectedYear ?? 2025})</span>
              <span className="baseline-original">{baselineTFR.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Mortality Rate Slider - INVERTED COLORS AND BADGE */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">🏥</span>
              Mortality Rate
              <InfoTooltip text={MORTALITY_TOOLTIP} />
            </label>
            {/* INVERTED: Positive % = RED (worse), Negative % = GREEN (better) */}
            <span className={`scenario-value ${scenarios.mortality === 0 ? 'baseline' : scenarios.mortality > 0 ? 'decrease' : 'increase'}`}>
              {scenarios.mortality > 0 ? '+' : ''}{scenarios.mortality}%
            </span>
          </div>

          <input
            type="range"
            min="-50"
            max="50"
            value={scenarios.mortality}
            step="5"
            onChange={(e) => onScenarioChange('mortality', parseInt(e.target.value))}
            className="slider slider-inverted"
          />

          <div className="scenario-markers">
            <span>-50% (better)</span>
            <span className="baseline-marker">0%</span>
            <span>+50% (worse)</span>
          </div>

          <div className="baseline-display">
            <div className="baseline-item">
              <span className="baseline-label">Current Rate</span>
              <span className="baseline-value">{adjustedMortality.toFixed(1)}/1000</span>
            </div>
            <div className="baseline-item">
              <span className="baseline-label">Baseline ({selectedYear ?? 2025})</span>
              <span className="baseline-original">{displayedBaselineMortality.toFixed(1)}/1000</span>
            </div>
          </div>
        </div>

        {/* Net Migration Slider */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">✈️</span>
              Net Migration
              <InfoTooltip text={MIGRATION_TOOLTIP} />
            </label>
            <span className={`scenario-value ${scenarios.migration === 0 ? 'baseline' : scenarios.migration > 0 ? 'increase' : 'decrease'}`}>
              {scenarios.migration > 0 ? '+' : ''}{scenarios.migration}%
            </span>
          </div>

          <input
            type="range"
            min="-75"
            max="75"
            value={scenarios.migration}
            step="5"
            onChange={(e) => onScenarioChange('migration', parseInt(e.target.value))}
            className="slider"
          />

          <div className="scenario-markers">
            <span>-75%</span>
            <span className="baseline-marker">0%</span>
            <span>+75%</span>
          </div>

          <div className="baseline-display">
            <div className="baseline-item">
              <span className="baseline-label">Current</span>
              <span className="baseline-value">{adjustedMigration.toLocaleString()}</span>
            </div>
            <div className="baseline-item">
              <span className="baseline-label">Baseline ({selectedYear ?? 2025})</span>
              <span className="baseline-original">{baselineMigration.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {!isHistorical && (scenarios.fertility !== 0 || scenarios.mortality !== 0 || scenarios.migration !== 0) && (
        <div className="scenario-active-banner">
          ⚠️ Custom scenario active - viewing adjusted projections
        </div>
      )}
    </div>
  );
}
