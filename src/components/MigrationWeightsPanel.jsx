import React, { useState, useEffect } from 'react';
import { loadMigrationDistribution } from '../utils/migrationDistribution';
import { clearProjectionCache } from '../utils/cohortComponentProjection';
import './MigrationWeightsPanel.css';

const AGE_LABELS = [
  '0–4', '5–9', '10–14', '15–19', '20–24', '25–29', '30–34', '35–39',
  '40–44', '45–49', '50–54', '55–59', '60–64', '65–69', '70–74',
  '75–79', '80–84', '85–89', '90–94', '95–99', '100+',
];

/**
 * Display the migration distribution as editable percentage rows.
 *
 * `weights` is either null (use CSV defaults) or { male: [...21], female: [...21] }
 * where each value is a share (0–1) of total net migration.
 *
 * On any edit, auto-normalises all shares so they sum to 1.0, then calls onWeightsChange.
 * "Reset to defaults" calls onWeightsChange(null) to revert to CSV values.
 */
export function MigrationWeightsPanel({ weights, onWeightsChange }) {
  const [csvDefaults, setCsvDefaults] = useState(null);

  // Load CSV defaults once on mount so we can pre-populate the table
  useEffect(() => {
    loadMigrationDistribution().then(d => setCsvDefaults(d));
  }, []);

  // What's actually shown: custom weights if set, CSV defaults otherwise
  const displayWeights = weights ?? csvDefaults;

  // Handle a cell change: update the share, then normalise the whole array.
  const handleCellChange = (gender, index, rawValue) => {
    if (!displayWeights) return;

    // Parse and clamp the new value (displayed as %, stored as share 0–1)
    const newPct = Math.max(0, Math.min(100, parseFloat(rawValue) || 0));
    const newShare = newPct / 100;

    const currentShares = [...displayWeights[gender]];
    const oldShare = currentShares[index];
    const delta = newShare - oldShare;

    if (Math.abs(delta) < 1e-10) return; // nothing changed

    // Distribute the delta proportionally across all OTHER cells
    currentShares[index] = newShare;
    const otherIndices = currentShares.map((_, i) => i).filter(i => i !== index);
    const otherSum = otherIndices.reduce((s, i) => s + currentShares[i], 0);

    if (otherSum > 1e-10) {
      // Scale others so total stays at 1
      const scaleFactor = (otherSum - delta) / otherSum;
      for (const i of otherIndices) {
        currentShares[i] = Math.max(0, currentShares[i] * scaleFactor);
      }
    } else {
      // All other cells are zero — distribute evenly
      const each = (1 - newShare) / otherIndices.length;
      for (const i of otherIndices) currentShares[i] = Math.max(0, each);
    }

    // Re-normalise to exactly 1.0 to fix floating-point drift
    const total = currentShares.reduce((s, v) => s + v, 0);
    const normalised = total > 0 ? currentShares.map(v => v / total) : currentShares;

    // Build the updated weights object
    const updatedWeights = {
      male:   gender === 'male'   ? normalised : [...displayWeights.male],
      female: gender === 'female' ? normalised : [...displayWeights.female],
    };

    clearProjectionCache();
    onWeightsChange(updatedWeights);
  };

  const handleReset = () => {
    clearProjectionCache();
    onWeightsChange(null);
  };

  if (!displayWeights) {
    return <div className="mwp-loading">Loading migration distribution…</div>;
  }

  // Compute grand totals for the footer
  const maleTotal   = displayWeights.male.reduce((s, v) => s + v, 0);
  const femaleTotal = displayWeights.female.reduce((s, v) => s + v, 0);

  return (
    <div className="migration-weights-panel">
      <div className="mwp-header">
        <div className="mwp-title-row">
          <h4>Migration Age/Gender Distribution</h4>
          <button className="mwp-reset-btn" onClick={handleReset}>
            ↺ Reset to Defaults
          </button>
        </div>
        <p className="mwp-description">
          Each row shows what share of net migrants is distributed into that age/gender cohort.
          Values are percentages of total net migration. Editing one cell auto-normalises the rest.
        </p>
      </div>

      <div className="mwp-table-scroll">
        <table className="mwp-table">
          <thead>
            <tr>
              <th>Age Group</th>
              <th className="male-col">Male (%)</th>
              <th className="female-col">Female (%)</th>
            </tr>
          </thead>
          <tbody>
            {AGE_LABELS.map((label, i) => (
              <tr key={label} className={i % 2 === 0 ? 'even' : 'odd'}>
                <td className="age-col">{label}</td>
                <td className="male-col">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={(displayWeights.male[i] * 100).toFixed(2)}
                    onChange={e => handleCellChange('male', i, e.target.value)}
                    className="mwp-input"
                  />
                </td>
                <td className="female-col">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={(displayWeights.female[i] * 100).toFixed(2)}
                    onChange={e => handleCellChange('female', i, e.target.value)}
                    className="mwp-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="mwp-total-row">
              <td>Total</td>
              <td className="male-col">{(maleTotal * 100).toFixed(1)}%</td>
              <td className="female-col">{(femaleTotal * 100).toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {weights !== null && (
        <div className="mwp-custom-banner">
          ⚙️ Custom migration distribution active
        </div>
      )}
    </div>
  );
}
