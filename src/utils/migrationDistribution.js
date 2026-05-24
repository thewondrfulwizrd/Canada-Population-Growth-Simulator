/**
 * Load migration distribution by age and gender from Statistics Canada data
 * Uses 2024/2025 fiscal year data (mapped to 2025 calendar year)
 * to determine how migrants are distributed across age groups
 */

let cachedMigrationDistribution = null;

/**
 * Load and parse migration data from CSV
 * Returns object with structure: { male: [shares], female: [shares] }
 * Where shares are proportions (0-1) of total migrants by age group
 * Index corresponds to age group index (0=0-4, 1=5-9, ..., 20=100+)
 */
export async function loadMigrationDistribution() {
  // Return cached version if already loaded
  if (cachedMigrationDistribution) {
    return cachedMigrationDistribution;
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/source/Base_Migration.csv`);
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header

    // Map of age group names to indices
    const ageGroupIndices = {
      '0 to 4 years': 0,
      '5 to 9 years': 1,
      '10 to 14 years': 2,
      '15 to 19 years': 3,
      '20 to 24 years': 4,
      '25 to 29 years': 5,
      '30 to 34 years': 6,
      '35 to 39 years': 7,
      '40 to 44 years': 8,
      '45 to 49 years': 9,
      '50 to 54 years': 10,
      '55 to 59 years': 11,
      '60 to 64 years': 12,
      '65 to 69 years': 13,
      '70 to 74 years': 14,
      '75 to 79 years': 15,
      '80 to 84 years': 16,
      '85 to 89 years': 17,
      '90 to 94 years': 18,
      '95 to 99 years': 19,
      '100 years and over': 20
    };

    const maleImmigrants = new Array(21).fill(0);
    const femaleImmigrants = new Array(21).fill(0);
    const maleNonPerm = new Array(21).fill(0);
    const femaleNonPerm = new Array(21).fill(0);
    const maleEmigration = new Array(21).fill(0);
    const femaleEmigration = new Array(21).fill(0);

    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 13) return;

      const refDate = matches[0].replace(/"/g, '').trim();
      const gender = matches[3].replace(/"/g, '').trim();
      const migrationType = matches[4].replace(/"/g, '').trim();
      const ageGroup = matches[5].replace(/"/g, '').trim();
      const valueStr = matches[12].replace(/"/g, '').trim();
      const value = parseInt(valueStr, 10) || 0;

      // Use 2024/2025 fiscal year data (stored as 2025 in our loader)
      if (refDate !== '2024/2025') return;
      // StatsCan's current labels are "Men+" / "Women+". Older vintages
      // exposed "Total - gender"; we don't use it (the gendered rows already
      // give us the actual split, which is not exactly 50/50).
      if (gender !== 'Men+' && gender !== 'Women+' &&
          gender !== 'Males' && gender !== 'Females') return;
      if (ageGroup === 'All ages') return; // Skip "All ages" - we want specific age groups

      const ageIndex = ageGroupIndices[ageGroup];
      if (ageIndex === undefined) return;

      // Parse gender
      let isMale = false;
      let isFemale = false;
      if (gender === 'Men+' || gender === 'Males')     isMale = true;
      else if (gender === 'Women+' || gender === 'Females') isFemale = true;

      // Add to appropriate category
      if (migrationType === 'Immigrants') {
        if (isMale) maleImmigrants[ageIndex] += value;
        if (isFemale) femaleImmigrants[ageIndex] += value;
      } else if (migrationType === 'Net non-permanent residents') {
        if (isMale) maleNonPerm[ageIndex] += value;
        if (isFemale) femaleNonPerm[ageIndex] += value;
      } else if (migrationType === 'Net emigration') {
        if (isMale) maleEmigration[ageIndex] += value;
        if (isFemale) femaleEmigration[ageIndex] += value;
      }
    });

    // Calculate net migration for each age group
    const maleNetMigration = maleImmigrants.map(
      (imm, i) => imm + maleNonPerm[i] - maleEmigration[i]
    );
    const femaleNetMigration = femaleImmigrants.map(
      (imm, i) => imm + femaleNonPerm[i] - femaleEmigration[i]
    );

    // Calculate total net migration
    const maleTotal = maleNetMigration.reduce((sum, v) => sum + v, 0);
    const femaleTotal = femaleNetMigration.reduce((sum, v) => sum + v, 0);
    const grandTotal = maleTotal + femaleTotal;

    // Convert to proportions (shares)
    const maleShares = maleNetMigration.map(v => grandTotal > 0 ? v / grandTotal : 0);
    const femaleShares = femaleNetMigration.map(v => grandTotal > 0 ? v / grandTotal : 0);

    cachedMigrationDistribution = {
      male: maleShares,
      female: femaleShares,
      maleTotal,
      femaleTotal,
      grandTotal
    };

    console.log('✓ Migration distribution loaded from 2024/2025 data');
    console.log('  Total net migration:', grandTotal);
    console.log('  Male share (sample):', maleShares.slice(0, 5));
    console.log('  Female share (sample):', femaleShares.slice(0, 5));

    return cachedMigrationDistribution;
  } catch (error) {
    console.error('Error loading migration distribution:', error);
    // Return uniform distribution if load fails
    const uniform = 1 / 21;
    return {
      male: new Array(21).fill(uniform),
      female: new Array(21).fill(uniform),
      maleTotal: 0,
      femaleTotal: 0,
      grandTotal: 0
    };
  }
}

/**
 * Get migration distribution synchronously (must be pre-loaded)
 */
export function getMigrationDistribution() {
  if (!cachedMigrationDistribution) {
    console.warn('Migration distribution not yet loaded - use loadMigrationDistribution() first');
    const uniform = 1 / 21;
    return {
      male: new Array(21).fill(uniform),
      female: new Array(21).fill(uniform),
      maleTotal: 0,
      femaleTotal: 0,
      grandTotal: 0
    };
  }
  return cachedMigrationDistribution;
}
