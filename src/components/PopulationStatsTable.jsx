import React, { useState, useEffect } from 'react';
import { applyScenarios } from '../utils/scenarioCalculations';
import { calculateMedianAge } from '../utils/populationHelpers';
import { loadHistoricalBirths, loadHistoricalDeaths, loadHistoricalMortality, loadHistoricalMigration } from '../utils/historicalDataLoader';
import './PopulationStatsTable.css';

export function PopulationStatsTable({ data, scenarios, selectedYear, migrationWeights = null }) {
  const [historicalBirths, setHistoricalBirths] = useState({});
  const [historicalDeaths, setHistoricalDeaths] = useState({});
  const [historicalMortality, setHistoricalMortality] = useState({});
  const [historicalMigration, setHistoricalMigration] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tableData, setTableData] = useState([]);

  // Load historical data on mount
  useEffect(() => {
    async function loadData() {
      const [births, deaths, mortality, migration] = await Promise.all([
        loadHistoricalBirths(),
        loadHistoricalDeaths(),
        loadHistoricalMortality(),
        loadHistoricalMigration()
      ]);
      
      setHistoricalBirths(births);
      setHistoricalDeaths(deaths);
      setHistoricalMortality(mortality);
      setHistoricalMigration(migration);
      setDataLoaded(true);
    }
    loadData();
  }, []);

  // Compute table data when scenarios or data change
  useEffect(() => {
    async function computeTableData() {
      if (!data || !dataLoaded) return;
      
      try {
        const years = [...data.yearsObserved, ...data.yearsProjected];
        const computed = [];
        let previousTotal = null;
        
        for (const year of years) {
          const population = await applyScenarios(data, scenarios, year, migrationWeights);
          if (!population) continue;
          
          const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
          const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
          const total = maleTotal + femaleTotal;

          // Calculate growth (set to "-" for year 2000)
          let nominalGrowth = 0;
          let percentGrowth = 0;
          let showGrowth = true;
          
          if (year === 2000) {
            showGrowth = false; // Show "-" for all components in 2000
          } else if (previousTotal !== null) {
            nominalGrowth = total - previousTotal;
            percentGrowth = (nominalGrowth / previousTotal) * 100; // Per year
          }

          // Determine if this is a historical year (≤ 2025)
          const isHistorical = year <= data.lastObservedYear;
          
          // Use actual data for historical years, calculated for projected
          let births, deaths, netMigration;
          
          // Year 2000 has no component data (no previous year to compare)
          if (year === 2000) {
            births = 0;
            deaths = 0;
            netMigration = 0;
          } else if (isHistorical) {
            // Use actual historical data from Statistics Canada
            births = historicalBirths[year] || 0;
            
            // Deaths: use actual data if available
            if (historicalDeaths[year]) {
              deaths = historicalDeaths[year];
            } else {
              // For 2024 and 2025, infer from mortality rates
              // Try to find the most recent mortality rate available
              let mortRate = historicalMortality[year] || 
                             historicalMortality[year - 1] || 
                             historicalMortality[2023] || 
                             historicalMortality[2022] || 
                             8.0; // fallback to baseline
              
              // mortality rate is per 1000 population
              deaths = Math.round((total / 1000) * mortRate);
            }
            
            netMigration = Math.round(historicalMigration[year] || 0);
          } else {
            // Use exact values from the cohort-component model:
            // _components contains age/sex-specific births, deaths, and migration
            // computed during the projection step for this exact year.
            const c = population._components;
            births = c.births;
            // Total deaths = existing-population deaths + infant deaths from
            // newborns + within-year deaths among new migrants. With all three
            // included, births - deaths + net_migration is an exact identity
            // with the cohort model's nominal population change.
            const infantSurvivors = (c.maleInfantSurvivors || 0) + (c.femaleInfantSurvivors || 0);
            const infantDeaths = births - infantSurvivors;
            const migrantDeaths = c.migrantDeaths || 0;
            deaths = c.deaths + infantDeaths + migrantDeaths;
            netMigration = c.adjustedNetMigration;
          }
          
          const naturalIncrease = births - deaths;

          previousTotal = total;

          const medianAge = calculateMedianAge(population);

          computed.push({
            year,
            population: total,
            nominalGrowth,
            percentGrowth,
            showGrowth,
            births,
            deaths,
            naturalIncrease,
            netMigration,
            medianAge,
            isHistorical
          });
        }
        
        setTableData(computed);
      } catch (error) {
        console.error('Error computing table data:', error);
        setTableData([]);
      }
    }
    
    computeTableData();
  }, [data, scenarios, dataLoaded, historicalBirths, historicalDeaths, historicalMortality, historicalMigration, migrationWeights]);

  if (!tableData.length) return <div>Loading statistics table...</div>;

  return (
    <div className="population-stats-table-container">
      <h2 className="section-heading">📊 Components of Population Growth</h2>
      <div className="table-description">
        Showing data for every year from {data.yearsObserved[0]} to {data.lastProjectedYear}. 
        Historical data ({data.yearsObserved[0]}-{data.lastObservedYear}) uses actual Statistics Canada figures. 
        Projected data ({data.yearsProjected[0]}-{data.lastProjectedYear}) shows calculated estimates with current scenario adjustments.
      </div>
      
      <div className="table-wrapper">
        <table className="population-stats-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Total Population</th>
              <th>Nominal Growth</th>
              <th>% Growth (annual)</th>
              <th>Births</th>
              <th>Deaths</th>
              <th>Natural Increase</th>
              <th>Net Migration</th>
              <th>Median Age</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <React.Fragment key={row.year}>
                <tr className={`${row.year === selectedYear ? 'highlighted' : ''} ${row.isHistorical ? 'historical' : 'projected'}`}>
                  <td className="year-cell">
                    <span className="year-value">{row.year}</span>
                    {row.year === selectedYear && <span className="current-badge">◄ Current</span>}
                  </td>
                  <td className="number-cell population-cell">
                    {(row.population / 1000000).toFixed(2)}M
                  </td>
                  <td className={`number-cell growth-cell ${row.nominalGrowth >= 0 ? 'positive' : 'negative'}`}>
                    {!row.showGrowth ? '-' : (row.nominalGrowth > 0 ? '+' : '') + (row.nominalGrowth / 1000).toFixed(0) + 'K'}
                  </td>
                  <td className={`number-cell growth-cell ${row.percentGrowth >= 0 ? 'positive' : 'negative'}`}>
                    {!row.showGrowth ? '-' : (row.percentGrowth > 0 ? '+' : '') + row.percentGrowth.toFixed(2) + '%'}
                  </td>
                  <td className="number-cell">
                    {!row.showGrowth ? '-' : (row.births > 0 ? (row.births / 1000).toFixed(0) + 'K' : '0K')}
                  </td>
                  <td className="number-cell">
                    {!row.showGrowth ? '-' : (row.deaths > 0 ? (row.deaths / 1000).toFixed(0) + 'K' : '0K')}
                  </td>
                  <td className={`number-cell ${row.naturalIncrease >= 0 ? 'positive' : 'negative'}`}>
                    {!row.showGrowth ? '-' : (row.naturalIncrease > 0 ? '+' : '') + (row.naturalIncrease / 1000).toFixed(0) + 'K'}
                  </td>
                  <td className="number-cell migration-cell">
                    {!row.showGrowth ? '-' : (row.netMigration > 0 ? '+' : '') + (row.netMigration / 1000).toFixed(0) + 'K'}
                  </td>
                  <td className="number-cell">
                    {row.medianAge !== null && row.medianAge !== undefined ? row.medianAge.toFixed(1) : '—'}
                  </td>
                </tr>
                {/* Demarcation between historical and projected */}
                {row.year === data.lastObservedYear && (
                  <tr className="demarcation-row">
                    <td colSpan="9">
                      <div className="demarcation-line">
                        <span className="demarcation-label">Historical Data Ends / Projections Begin</span>
                      </div>
                    </td>
                  </tr>
                )}
                {/* NPR drawdown note — appears immediately after the 2026 row */}
                {row.year === 2026 && (
                  <tr className="npr-note-row">
                    <td colSpan="9">
                      <div className="npr-note">
                        <span className="npr-note-icon">ℹ️</span>
                        <span>
                          <strong>Net Migration (2026–2029):</strong> These figures reflect Canada's
                          ongoing drawdown of its non-permanent resident (NPR) stock. Federal policy
                          targets NPR ≤ 5% of population (~2.1M), requiring a reduction of ~500K from
                          the 2024 peak — spread across 2026–2028. As a result, net migration is
                          temporarily depressed (or negative in 2026) even as PR admissions continue.
                          By 2030 the NPR stock stabilises and net migration returns to the ~400K baseline.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}