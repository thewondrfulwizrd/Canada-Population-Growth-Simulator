// Get population for a specific year
export function getPopulationByYear(data, year) {
  if (year <= data.lastObservedYear) {
    // For observed years, access from 'observed' object
    if (data.observed && data.observed[year.toString()]) {
      return data.observed[year.toString()];
    }
  } else {
    // For projected years, access from 'projected' object
    if (data.projected && data.projected[year.toString()]) {
      return data.projected[year.toString()];
    }
  }
  
  // Fallback in case year not found
  console.warn(`Population data not found for year ${year}`);
  return null;
}

// Calculate total population for a specific year
export function getTotalPopulation(data, year) {
  const population = getPopulationByYear(data, year);
  
  if (!population) {
    return null;
  }
  
  const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
  const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
  
  return {
    male: maleTotal,
    female: femaleTotal,
    total: maleTotal + femaleTotal
  };
}

// Determine if a year is observed or projected
export function getYearType(data, year) {
  return year <= data.lastObservedYear ? 'observed' : 'projected';
}

/**
 * Calculate median age from population arrays.
 * Uses linear interpolation within the bin that straddles the 50th percentile.
 * Age groups are assumed to be 5-year bins starting at 0 (0-4, 5-9, ..., 95-99, 100+).
 * The 100+ bin is approximated as 10 years wide (100–110) for interpolation.
 *
 * @param {Object} population - { male: Array[21], female: Array[21] }
 * @returns {number|null} Median age, or null if population is empty
 */
export function calculateMedianAge(population) {
  const { male, female } = population;
  if (!male || !female) return null;

  const total = male.reduce((s, v) => s + (v || 0), 0) + female.reduce((s, v) => s + (v || 0), 0);
  if (total === 0) return null;

  const target = total / 2;
  let cumulative = 0;

  for (let i = 0; i < 21; i++) {
    const cohortPop = (male[i] || 0) + (female[i] || 0);
    const lowerBound = i * 5;           // 0, 5, 10, …, 100
    const binWidth   = i < 20 ? 5 : 10; // 100+ bin treated as 10 years wide

    if (cumulative + cohortPop >= target) {
      return lowerBound + ((target - cumulative) / cohortPop) * binWidth;
    }
    cumulative += cohortPop;
  }
  return 100; // fallback
}

// Format population numbers for display
export function formatPopulation(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}