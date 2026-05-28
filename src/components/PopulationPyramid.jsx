import React, { useState, useEffect } from 'react';
import { usePopulationData } from '../hooks/usePopulationData';
import { getYearType, formatPopulation, calculateMedianAge } from '../utils/populationHelpers';
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
  // Parse URL query params once on mount for shareable links
  const [selectedYear, setSelectedYear] = useState(() => {
    const y = parseInt(new URLSearchParams(window.location.search).get('year'));
    return (!isNaN(y) && y >= 2000 && y <= 2100) ? y : 2026;
  });
  const [scenarios, setScenarios] = useState(() => {
    const p  = new URLSearchParams(window.location.search);
    const f  = parseInt(p.get('fertility'));
    const m  = parseInt(p.get('mortality'));
    const mg = parseInt(p.get('migration'));
    return {
      fertility: !isNaN(f)  ? Math.max(-50,  Math.min(50,  f))  : 0,
      mortality: !isNaN(m)  ? Math.max(-50,  Math.min(50,  m))  : 0,
      migration: !isNaN(mg) ? Math.max(-100, Math.min(100, mg)) : 0,
    };
  });
  const [population, setPopulation] = useState({ male: [], female: [] });
  const [showDebugTable, setShowDebugTable] = useState(false);
  // Fixed mortality reference points (2025 = today's rate, 2075 = trajectory endpoint)
  // Computed once on data load; not affected by year or scenario sliders.
  const [baseMort2025, setBaseMort2025] = useState(7.5);
  const [baseMort2075, setBaseMort2075] = useState(9.0);
  const [shareCopied, setShareCopied] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Compute fixed mortality reference points once when data loads.
  // 2025 = current baseline; 2075 = trajectory endpoint (includes aging effect).
  // These do NOT change when the year slider or scenario sliders move.
  useEffect(() => {
    async function computeMortalityRefs() {
      if (!data) return;
      const zero = { fertility: 0, mortality: 0, migration: 0 };
      try {
        const [pop2025, pop2075] = await Promise.all([
          applyScenarios(data, zero, 2025),
          applyScenarios(data, zero, 2075),
        ]);
        if (pop2025?.male?.length) {
          setBaseMort2025(await calculateGlobalMortalityRate(pop2025, zero));
        }
        if (pop2075?.male?.length) {
          setBaseMort2075(await calculateGlobalMortalityRate(pop2075, zero));
        }
      } catch (err) {
        console.error('Error computing mortality references:', err);
      }
    }
    computeMortalityRefs();
  }, [data]); // Only when data loads, never again

  // Scroll-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const handleShare = () => {
    const params = new URLSearchParams({
      year: selectedYear,
      fertility: scenarios.fertility,
      mortality: scenarios.mortality,
      migration: scenarios.migration,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    window.history.replaceState(null, '', `?${params}`);
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {
      // Fallback: prompt user to copy manually
      window.prompt('Copy this link:', url);
    });
  };

  const medianAge = population.male.length ? calculateMedianAge(population) : null;

  return (
    <div className="population-pyramid">
      {/* Canadian Flag Image */}
      <div className="canada-flag">
        <img src={`${import.meta.env.BASE_URL}canadaflag1.png`} alt="Canada Flag" />
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
        onShare={handleShare}
        shareCopied={shareCopied}
        isHistorical={isHistorical}
        baseMort2025={baseMort2025}
        baseMort2075={baseMort2075}
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
          <div className="stat">
            <span className="label">Median Age</span>
            <span className="value">{medianAge !== null ? medianAge.toFixed(1) : '—'}</span>
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

      {/* Scroll-to-top button — appears after scrolling past the chart */}
      {showScrollTop && (
        <button
          className="scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}

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