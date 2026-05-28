import { InfoTooltip } from './InfoTooltip';
import { MigrationWeightsPanel } from './MigrationWeightsPanel';
import './ScenarioControls.css';

// Fixed trajectory endpoints shown in the slider display panels
const BASE_TFR      = 1.25;  // 2025 observed
const TARGET_TFR    = 1.45;  // trajectory endpoint (2050)
const MIGRATION_REF = 400_000; // long-run PR admission target (NPR patch is model-internal)

const FERTILITY_TOOLTIP =
  'TFR (2025) shows Canada\'s current total fertility rate — the fixed starting point. ' +
  'Target by 2050 reflects projected partial recovery (1.25 → 1.45). ' +
  'Slider applies a permanent % adjustment to the entire trajectory.';

const MORTALITY_TOOLTIP =
  'Rate (2025) is today\'s crude death rate — fixed reference. ' +
  'Projected (2075) shows the expected rate after ~0.7%/yr improvement in age-specific rates, combined with population aging. ' +
  'The crude rate rises over time because more elderly people means more deaths per capita, even as individual age-group rates improve. ' +
  'Slider adjusts the trajectory.';

const MIGRATION_TOOLTIP =
  'Annual PR target is Canada\'s long-run permanent-resident admission goal (~400K/yr). ' +
  'Near-term NPR drawdown (2026–2029) is applied automatically by the model in the background. ' +
  'Slider adjusts net migration relative to the 400K baseline.';

/**
 * ScenarioControls component
 *
 * Row 1 (fixed): 2025 anchor value — never changes with year slider or scenario slider.
 * Row 2 (adjustable): trajectory endpoint × scenario-slider multiplier.
 */
export function ScenarioControls({
  scenarios,
  onScenarioChange,
  onReset,
  onShare,
  shareCopied,
  isHistorical,
  baseMort2025,
  baseMort2075,
  showAdvanced,
  onToggleAdvanced,
  migrationWeights,
  onMigrationWeightsChange,
}) {
  // Fixed 2025 references
  const mort2025 = baseMort2025 || 7.5;
  const mort2075 = baseMort2075 || 9.0;

  // Trajectory endpoints adjusted by slider (Row 2)
  const targetTFR2050  = TARGET_TFR * (1 + scenarios.fertility / 100);
  const projMort2075   = mort2075   * (1 + scenarios.mortality  / 100);
  const adjMigration   = Math.round(MIGRATION_REF * (1 + scenarios.migration / 100));

  return (
    <div className="scenario-controls">
      <div className="scenario-header">
        <h3>📊 Scenario Builder</h3>
        <div className="scenario-header-actions">
          <button className="reset-button" onClick={onReset}>
            Reset to Baseline
          </button>
          <button className={`share-button${shareCopied ? ' copied' : ''}`} onClick={onShare}>
            {shareCopied ? '✅ Copied!' : '🔗 Share'}
          </button>
        </div>
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
              <span className="baseline-label">Current TFR (2025)</span>
              <span className="baseline-original">{BASE_TFR.toFixed(2)}</span>
            </div>
            <div className="baseline-item">
              <span className="baseline-label">Projected TFR (2050)</span>
              <span className="baseline-value">{targetTFR2050.toFixed(2)}</span>
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
              <span className="baseline-label">Current MR (2025)</span>
              <span className="baseline-original">{mort2025.toFixed(1)}/1000</span>
            </div>
            <div className="baseline-item">
              <span className="baseline-label">Projected MR (2075)</span>
              <span className="baseline-value">{projMort2075.toFixed(1)}/1000</span>
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
            min="-100"
            max="100"
            value={scenarios.migration}
            step="5"
            onChange={(e) => onScenarioChange('migration', parseInt(e.target.value))}
            className="slider"
          />

          <div className="scenario-markers">
            <span>-100%</span>
            <span className="baseline-marker">0%</span>
            <span>+100%</span>
          </div>

          <div className="baseline-display">
            <div className="baseline-item">
              <span className="baseline-label">Annual PR Target</span>
              <span className="baseline-original">{MIGRATION_REF.toLocaleString()}</span>
            </div>
            <div className="baseline-item">
              <span className="baseline-label">Projected PR Target (2030)</span>
              <span className="baseline-value">{adjMigration.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Options toggle */}
      <button className="advanced-toggle-btn" onClick={onToggleAdvanced}>
        {showAdvanced ? '▲ Hide Advanced Options' : '▼ Advanced Options'}
      </button>

      {showAdvanced && (
        <MigrationWeightsPanel
          weights={migrationWeights}
          onWeightsChange={onMigrationWeightsChange}
        />
      )}

      {!isHistorical && (scenarios.fertility !== 0 || scenarios.mortality !== 0 || scenarios.migration !== 0) && (
        <div className="scenario-active-banner">
          ⚠️ Custom scenario active - viewing adjusted projections
        </div>
      )}
    </div>
  );
}
