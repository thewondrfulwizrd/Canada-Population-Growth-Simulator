/**
 * Load and parse historical data from CSV files
 * 
 * IMPORTANT: Fiscal years are shifted forward by 1 year because:
 * - Population is measured as of July 1 each year
 * - Fiscal year 2024/2025 (July 1, 2024 - June 30, 2025) leads to July 1, 2025 population
 * - Therefore 2024/2025 → stored as year 2025
 */

export async function loadHistoricalBirths() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/source/Base_Births.csv`);
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const birthsByYear = {};
    lines.forEach(line => {
      // Parse CSV line, handling quoted fields
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 11) return;
      
      const refDate = matches[0].replace(/"/g, '').trim();
      const genderField = matches[3].replace(/"/g, '').trim();
      const valueStr = matches[10].replace(/"/g, '').trim(); // INDEX 10 for births
      const value = parseInt(valueStr, 10);
      
      if (isNaN(value)) return;
      
      // Extract year from fiscal year format (YYYY/YYYY)
      // Fiscal year YYYY/YYYY+1 represents data for calendar year YYYY+1
      if (refDate.includes('/')) {
        const [, endYear] = refDate.split('/').map(y => parseInt(y));

        // Only count "Total - gender" to avoid double-counting
        // Store using END year (e.g., 2024/2025 → 2025)
        if (genderField === 'Total - gender') {
          birthsByYear[endYear] = value;
        }
      } else {
        // Non-fiscal year format (shouldn't happen for births, but handle it)
        const year = parseInt(refDate);
        if (genderField === 'Total - gender') {
          birthsByYear[year] = value;
        }
      }
    });
    
    return birthsByYear;
  } catch (error) {
    console.error('Error loading births data:', error);
    return {};
  }
}

export async function loadHistoricalDeaths() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/source/Base_Deaths.csv`);
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const deathsByYear = {};
    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 12) return;
      
      // Deaths CSV: REF_DATE (index 0), GEO, DGUID, Age, Sex, UOM, ..., VALUE (index 11)
      const refDate = matches[0].replace(/"/g, '').trim();
      const ageGroup = matches[3].replace(/"/g, '').trim();
      const valueStr = matches[11].replace(/"/g, '').trim();
      const value = parseInt(valueStr, 10);
      
      if (isNaN(value)) return;
      
      const year = parseInt(refDate);
      
      // Only count "Age at time of death, all ages" to get total
      if (ageGroup === 'Age at time of death, all ages') {
        deathsByYear[year] = value;
      }
    });
    
    return deathsByYear;
  } catch (error) {
    console.error('Error loading deaths data:', error);
    return {};
  }
}

export async function loadHistoricalMortality() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/source/Base_Mortality.csv`);
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const mortalityByYear = {};
    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 12) return;
      
      const refDate = matches[0].replace(/"/g, '').trim();
      const ageGroup = matches[3].replace(/"/g, '').trim();
      const valueStr = matches[11].replace(/"/g, '').trim();
      const value = parseFloat(valueStr);
      
      if (isNaN(value)) return;
      
      const year = parseInt(refDate);
      
      // Only count "All ages" to get overall mortality rate
      if (ageGroup.includes('All ages')) {
        mortalityByYear[year] = value;
      }
    });
    
    return mortalityByYear;
  } catch (error) {
    console.error('Error loading mortality data:', error);
    return {};
  }
}

export async function loadHistoricalMigration() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/source/Base_Migration.csv`);
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const immigrationByYear = {};
    const nonPermByYear = {};
    const emigrationByYear = {};
    
    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 13) return;
      
      const refDate = matches[0].replace(/"/g, '').trim();
      const genderField = matches[3].replace(/"/g, '').trim();
      const migrationType = matches[4].replace(/"/g, '').trim();
      const ageGroup = matches[5].replace(/"/g, '').trim();
      const valueStr = matches[12].replace(/"/g, '').trim(); // Migration VALUE is at index 12
      const value = parseInt(valueStr, 10) || 0;
      
      // Accept "Total - gender" (old vintage) OR "Men+"/"Women+" (May 2025 vintage).
      // Summing Men+ + Women+ rows naturally produces the correct total per
      // year/migration-type since we accumulate with +=.
      const isAnyGender =
        genderField === 'Total - gender' ||
        genderField === 'Men+'           ||
        genderField === 'Women+';
      if (!isAnyGender || ageGroup !== 'All ages') return;
      
      // Extract year from fiscal year format (YYYY/YYYY)
      // Fiscal year YYYY/YYYY+1 represents data for calendar year YYYY+1
      let year;
      if (refDate.includes('/')) {
        const [, endYear] = refDate.split('/').map(y => parseInt(y));
        year = endYear; // Use END year (e.g., 2024/2025 → 2025)
      } else {
        year = parseInt(refDate);
      }
      
      if (!immigrationByYear[year]) immigrationByYear[year] = 0;
      if (!nonPermByYear[year]) nonPermByYear[year] = 0;
      if (!emigrationByYear[year]) emigrationByYear[year] = 0;
      
      if (migrationType === 'Immigrants') {
        immigrationByYear[year] += value;
      } else if (migrationType === 'Net non-permanent residents') {
        nonPermByYear[year] += value;
      } else if (migrationType === 'Net emigration') {
        emigrationByYear[year] += value;
      }
    });
    
    // Calculate net migration: Immigrants + Net non-permanent residents - Net emigration
    const netMigrationByYear = {};
    const allYears = new Set([
      ...Object.keys(immigrationByYear),
      ...Object.keys(nonPermByYear),
      ...Object.keys(emigrationByYear)
    ]);
    
    allYears.forEach(year => {
      const immigrants = immigrationByYear[year] || 0;
      const nonPerm = nonPermByYear[year] || 0;
      const emigration = emigrationByYear[year] || 0;
      netMigrationByYear[year] = immigrants + nonPerm - emigration;
    });
    
    return netMigrationByYear;
  } catch (error) {
    console.error('Error loading migration data:', error);
    return {};
  }
}