import React, { useEffect, useRef, useState } from 'react';
import { applyScenarios } from '../utils/scenarioCalculations';
import './PopulationTrendChart.css';

export function PopulationTrendChart({ data, scenarios, selectedYear, onYearChange }) {
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Compute chart data when scenarios or data change
  useEffect(() => {
    async function computeChartData() {
      if (!data) return;
      setLoading(true);
      try {
        const years = [...data.yearsObserved, ...data.yearsProjected];
        const computed = [];
        
        for (const year of years) {
          const population = await applyScenarios(data, scenarios, year);
          if (population) {
            const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
            const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
            const total = maleTotal + femaleTotal;
            computed.push({ year, total });
          }
        }
        
        setChartData(computed);
      } catch (error) {
        console.error('Error computing chart data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }
    
    computeChartData();
  }, [data, scenarios]);

  if (!chartData.length || loading) return <div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart...</div>;

  // Find min and max for scaling
  const minPop = Math.min(...chartData.map(d => d.total));
  const maxPop = Math.max(...chartData.map(d => d.total));
  const popRange = maxPop - minPop;

  // Calculate chart dimensions - INCREASED HEIGHT
  const width = 1000;
  const height = 340; // Increased from 300
  const padding = { top: 30, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Create points for the line
  const points = chartData.map((d, i) => {
    const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.total - minPop) / popRange) * chartHeight;
    return { x, y, year: d.year, total: d.total };
  });

  // Create SVG path for the line
  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  
  // Create area fill path
  const areaPath = `M ${padding.left},${padding.top + chartHeight} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;

  // Find the transition point between observed and projected (year 2025)
  const transitionIndex = chartData.findIndex(d => d.year === 2025);
  const transitionX = padding.left + (transitionIndex / (chartData.length - 1)) * chartWidth;
  
  // Calculate gradient percentage - relative to the actual chart area
  const gradientTransitionPercent = ((transitionX - padding.left) / chartWidth) * 100;

  // Highlight current year
  const currentIndex = chartData.findIndex(d => d.year === selectedYear);
  const currentPoint = points[currentIndex];
  const currentPopulation = chartData[currentIndex]?.total;
  
  // Calculate ANNUAL change instead of change from 2025
  let annualChangePercent = '-';
  let annualChangeNominal = '-';
  if (currentIndex > 0) {
    const previousPopulation = chartData[currentIndex - 1]?.total;
    if (previousPopulation) {
      const nominalChange = currentPopulation - previousPopulation;
      const percentChange = (nominalChange / previousPopulation) * 100;
      annualChangePercent = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`;
      annualChangeNominal = `${nominalChange >= 0 ? '+' : ''}${(nominalChange / 1000).toFixed(0)}K`;
    }
  }

  // Y-axis labels
  const yAxisLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = minPop + (popRange * i / 4);
    const y = padding.top + chartHeight - (chartHeight * i / 4);
    yAxisLabels.push({ value, y });
  }

  // X-axis labels (every 25 years)
  const xAxisLabels = [];
  for (let year = 2000; year <= 2100; year += 25) {
    const index = chartData.findIndex(d => d.year === year);
    if (index >= 0) {
      const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
      xAxisLabels.push({ year, x });
    }
  }

  // Handle drag/click on the chart
  const handleChartInteraction = (event) => {
    if (!svgRef.current || !onYearChange) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const svgWidth = rect.width;
    const scaleX = width / svgWidth;
    
    // Get mouse/touch position relative to SVG
    const clientX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
    const clickX = (clientX - rect.left) * scaleX;
    
    // Convert to chart coordinates
    const chartX = clickX - padding.left;
    if (chartX < 0 || chartX > chartWidth) return;
    
    // Find nearest year
    const fraction = chartX / chartWidth;
    const yearIndex = Math.round(fraction * (chartData.length - 1));
    const newYear = chartData[yearIndex]?.year;
    
    if (newYear && newYear >= data.yearsObserved[0] && newYear <= data.lastProjectedYear) {
      onYearChange(newYear);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleChartInteraction(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleChartInteraction(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    handleChartInteraction(e);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      handleChartInteraction(e);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="population-trend-chart">
      <div className="chart-container">
        <svg 
          ref={svgRef}
          width="100%" 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'pointer', touchAction: 'none' }}
        >
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1976d2" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1976d2" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Gradient for the line - transitions at 2025, not lastObservedYear */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1976d2" />
              <stop offset={`${gradientTransitionPercent}%`} stopColor="#1976d2" />
              <stop offset={`${gradientTransitionPercent}%`} stopColor="#7b1fa2" />
              <stop offset="100%" stopColor="#7b1fa2" />
            </linearGradient>
            
            {/* Shadow filter */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yAxisLabels.map((label, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={label.y}
              x2={padding.left + chartWidth}
              y2={label.y}
              className="grid-line"
            />
          ))}

          {/* Observed/Projected divider at 2025 - NO LABEL to avoid overlap */}
          <line
            x1={transitionX}
            y1={padding.top}
            x2={transitionX}
            y2={padding.top + chartHeight}
            className="divider-line"
          />

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            className="area-fill"
          />

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="trend-line"
            filter="url(#shadow)"
          />

          {/* Current year indicator */}
          {currentPoint && (
            <>
              <line
                x1={currentPoint.x}
                y1={padding.top}
                x2={currentPoint.x}
                y2={padding.top + chartHeight}
                className="current-year-line"
              />
              {/* Draggable circle */}
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="8"
                className="current-year-point-outer"
                style={{ cursor: 'grab' }}
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="5"
                fill="white"
                style={{ pointerEvents: 'none' }}
              />
              {/* Year label at TOP of the line to avoid x-axis interference */}
              <text
                x={currentPoint.x}
                y={padding.top - 10}
                className="current-year-label"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {selectedYear}
              </text>
            </>
          )}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            className="axis-line"
          />

          {/* Y-axis labels */}
          {yAxisLabels.map((label, i) => (
            <text
              key={i}
              x={padding.left - 10}
              y={label.y + 4}
              className="axis-label"
              textAnchor="end"
            >
              {(label.value / 1000000).toFixed(0)}M
            </text>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            className="axis-line"
          />

          {/* X-axis labels */}
          {xAxisLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={padding.top + chartHeight + 20}
              className="axis-label"
              textAnchor="middle"
            >
              {label.year}
            </text>
          ))}

          {/* Y-axis title */}
          <text
            x={20}
            y={height / 2}
            className="axis-title"
            textAnchor="middle"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            Population
          </text>

          {/* X-axis title */}
          <text
            x={width / 2}
            y={height - 5}
            className="axis-title"
            textAnchor="middle"
          >
            Year
          </text>
        </svg>
      </div>

      {/* Simplified footer with population and ANNUAL change */}
      <div className="chart-footer-simple">
        <div className="population-display">
          <div className="population-main">
            {(currentPopulation / 1000000).toFixed(2)}M
          </div>
          <div className="population-label">Population in {selectedYear}</div>
        </div>
        <div className="change-display">
          <div className="change-value" style={{ color: annualChangePercent === '-' ? '#666' : (annualChangePercent.startsWith('+') ? '#2e7d32' : '#c62828') }}>
            {annualChangeNominal} ({annualChangePercent})
          </div>
          <div className="change-label">Annual Change</div>
        </div>
      </div>
    </div>
  );
}