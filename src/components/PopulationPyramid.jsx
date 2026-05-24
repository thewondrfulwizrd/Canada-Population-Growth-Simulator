import React, { useState, useEffect } from 'react';
import { usePopulationData } from '../hooks/usePopulationData';
import { getYearType, formatPopulation } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import { calculateGlobalMortalityRate } from '../utils/cohortComponentProjection';
import { ScenarioControls } from './ScenarioControls';
import { PopulationTrendChart } from './PopulationTrendChart';
import { PopulationStatsTable } from './PopulationStatsTable';
import { YearSlider } from './YearSlider';
import { DebugTable } from './DebugTable';
import './PopulationPyramid.css';
import './DebugTable.css';

export function PopulationPyramid() {
  const { data, loading, error } = usePopulationData();
  const [selectedYear, setSelectedYear] = useState(2025);
  const [scenarios, setScenarios] = useState({
    fertility: 0,
    mortality: 0,
    migration: 0
  });
  const [population, setPopulation] = useState({ male: [], female: [] });
  const [showDebugTable, setShowDebugTable] = useState(false);
  const [baselineMortality, setBaselineMortality] = useState(7.5);

  // Compute population when year or scenarios change
  useEffect(() => {
    async function computePopulation() {
      if (!data) return;
      try {
        const result = await applyScenarios(data, scenarios, selectedYear);
        setPopulation(result || { male: [], female: [] });
      } catch (err) {
        console.error('Error computing population:', err);
        setPopulation({ male: [], female: [] });
      }
    }
    computePopulation();
  }, [data, scenarios, selectedYear]);

  // Calculate baseline mortality for the selected year (with 0% scenarios)
  // This should update when the year changes, showing the natural mortality
  // rate for that year's age structure
  useEffect(() => {
    async function computeBaselineMortality() {
      if (!data) return;

      try {
        const baselinePop = await applyScenarios(
          data,
          { fertility: 0, mortality: 0, migration: 0 },
          selectedYear
        );

        if (!baselinePop || !baselinePop.male || !baselinePop.male.length) return;

        const baseline = await calculateGlobalMortalityRate(
          baselinePop,
          { fertility: 0, mortality: 0, migration: 0 }
        );

        setBaselineMortality(baseline);
      } catch (err) {
        console.error('Error calculating baseline mortality:', err);
      }
    }
    
    computeBaselineMortality();
  }, [selectedYear, data]);  // Only when year or data changes, NOT scenarios

  if (loading) return <div>Loading population data...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;
  if (!data) return null;

  // Calculate totals from adjusted population
  const totals = {
    male: population.male.reduce((sum, val) => sum + val, 0),
    female: population.female.reduce((sum, val) => sum + val, 0)
  };
  totals.total = totals.male + totals.female;
  
  const yearType = getYearType(data, selectedYear);
  const isHistorical = yearType === 'observed';
  const ages = data.ages;

  const maxPop = Math.max(
    ...population.male,
    ...population.female,
    1 // Prevent max from being 0
  );

  const handleScenarioChange = (type, value) => {
    setScenarios(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleReset = () => {
    setScenarios({
      fertility: 0,
      mortality: 0,
      migration: 0
    });
  };

  return (
    <div className="population-pyramid">
      {/* Canadian Flag Image */}
      <div className="canada-flag">
        <img src="/canadaflag1.png" alt="Canada Flag" />
      </div>
      
      <h1>Canada Population Growth Model, 2025-2100</h1>
      
      {/* Population Trend Chart - MOVED TO TOP */}
      <PopulationTrendChart data={data} scenarios={scenarios} selectedYear={selectedYear} onYearChange={setSelectedYear} />

      {/* First Year Selector */}
      <YearSlider data={data} selectedYear={selectedYear} onYearChange={setSelectedYear} yearType={yearType} />

      {/* Scenario Controls - Always visible */}
      <ScenarioControls
        scenarios={scenarios}
        onScenarioChange={handleScenarioChange}
        onReset={handleReset}
        isHistorical={isHistorical}
        baselineMortality={baselineMortality}
        selectedYear={selectedYear}
      />

      {/* Section Divider */}
      <div className="section-divider"></div>

      {/* Population Pyramid Section */}
      <div className="pyramid-section">
        {/* Large Year Display instead of heading */}
        <div className="pyramid-year-display">{selectedYear}</div>
        
        {/* Population Summary */}
        <div className="summary">
          <div className="stat">
            <span className="label">Male</span>
            <span className="value male">{formatPopulation(totals.male)}</span>
          </div>
          <div className="stat">
            <span className="label">Total</span>
            <span className="value total">{formatPopulation(totals.total)}</span>
          </div>
          <div className="stat">
            <span className="label">Female</span>
            <span className="value female">{formatPopulation(totals.female)}</span>
          </div>
        </div>

        {/* Pyramid Chart */}
        <div className="pyramid-chart">
          {population.male && population.male.length > 0 ? (
            [...ages].reverse().map((ageGroup, reversedIndex) => {
              const index = ages.length - 1 - reversedIndex;
              const malePop = population.male[index] || 0;
              const femalePop = population.female[index] || 0;
              const malePercent = (malePop / maxPop) * 100;
              const femalePercent = (femalePop / maxPop) * 100;

              return (
                <div key={ageGroup} className="pyramid-row">
                  <div className="male-container">
                    <span className="pop-value male-value">{formatPopulation(malePop)}</span>
                    <div className="bar-wrapper male-wrapper">
                      <div 
                        className="bar male-bar"
                        style={{ width: `${malePercent}%` }}
                        title={`Males ${ageGroup}: ${malePop.toLocaleString()}`}
                      />
                    </div>
                  </div>
                  
                  <div className="age-label">{ageGroup}</div>
                  
                  <div className="female-container">
                    <div className="bar-wrapper female-wrapper">
                      <div 
                        className="bar female-bar"
                        style={{ width: `${femalePercent}%` }}
                        title={`Females ${ageGroup}: ${femalePop.toLocaleString()}`}
                      />
                    </div>
                    <span className="pop-value female-value">{formatPopulation(femalePop)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div>Loading pyramid...</div>
          )}
        </div>
      </div>

      {/* Section Divider */}
      <div className="section-divider"></div>

      {/* Second Year Selector - Between Pyramid and Stats */}
      <YearSlider data={data} selectedYear={selectedYear} onYearChange={setSelectedYear} yearType={yearType} />

      {/* Population Statistics Table */}
      <PopulationStatsTable data={data} scenarios={scenarios} selectedYear={selectedYear} />

      {/* Debug Table — development only */}
      {import.meta.env.DEV && (
        <>
          <button
            className="debug-button"
            onClick={() => setShowDebugTable(!showDebugTable)}
          >
            {showDebugTable ? '🔼 Hide Debug Breakdown' : '🔽 Show Debug Breakdown'}
          </button>
          <DebugTable
            data={data}
            scenarios={scenarios}
            visible={showDebugTable}
          />
        </>
      )}
    </div>
  );
}