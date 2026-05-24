import React from 'react';
import './ScenarioControls.css';

const BASELINE_FERTILITY = 1.26; // Total Fertility Rate - Canada's 2023-2024 (Statistics Canada)
const BASELINE_MIGRATION = 400000; // Net migration per year

/**
 * ScenarioControls component
 * 
 * Key changes:
 * - BASELINE_FERTILITY updated to 1.25 (Canada's actual TFR)
 * - baselineMortality is now passed as a prop (calculated from actual year data)
 * - Mortality rate displayed is year-dependent and reflects actual deaths/population
 */
export function ScenarioControls({ scenarios, onScenarioChange, onReset, isHistorical, baselineMortality }) {
  // Use passed-in baseline mortality (calculated from actual year data)
  // Default to 7.5 if not provided (fallback to approximate Canada average)
  const displayedBaselineMortality = baselineMortality || 7.5;
  
  // Log what we're receiving and displaying
  console.log('[ScenarioControls] baselineMortality prop:', baselineMortality);
  console.log('[ScenarioControls] displayedBaselineMortality:', displayedBaselineMortality);

  // Calculate adjusted baseline figures
  const adjustedFertility = BASELINE_FERTILITY * (1 + scenarios.fertility / 100);
  // MORTALITY: Positive % = higher mortality rate (worse), Negative % = lower mortality rate (better)
  const adjustedMortality = displayedBaselineMortality * (1 + scenarios.mortality / 100);
  const adjustedMigration = Math.round(BASELINE_MIGRATION * (1 + scenarios.migration / 100));

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
              <span className="baseline-label">Baseline</span>
              <span className="baseline-original">{BASELINE_FERTILITY.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Mortality Rate Slider - INVERTED COLORS AND BADGE */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">🏥</span>
              Mortality Rate
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
              <span className="baseline-label">Baseline</span>
              <span className="baseline-original">{displayedBaselineMortality.toFixed(1)}/1000</span>
            </div>
          </div>
          
          {/* Note about year-dependent baseline */}
          <div className="scenario-note">
            <small>Baseline mortality for selected year (calculated from deaths/population)</small>
          </div>
        </div>

        {/* Net Migration Slider */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">✈️</span>
              Net Migration
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
              <span className="baseline-label">Baseline</span>
              <span className="baseline-original">{BASELINE_MIGRATION.toLocaleString()}</span>
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