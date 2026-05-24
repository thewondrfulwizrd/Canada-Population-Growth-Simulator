# Baseline Mortality Calculation - FINAL FIX

## The Problem

Baseline mortality displayed as hardcoded 7.5 per 1000 and never changed when moving the year slider.

## Why Previous Attempts Failed

### Attempt 1: Hardcoded constant
```javascript
const BASELINE_MORTALITY = 75;  // ❌ Wrong value, never changes
```

### Attempt 2: Calculate from data.deaths
```javascript
function calculateBaselineMortality(data, year) {
  return (data.deaths / data.population) * 1000;  // ❌ data.deaths doesn't exist
}
// Always returned 7.5 fallback
```

### Attempt 3: Calculate from current population
```javascript
const baseline = await calculateGlobalMortalityRate(population, {...});
```
**Problem:** `population` already has scenario adjustments applied! If user sets +20% mortality, the population structure is already altered by those extra deaths.

## The Real Fix

**Key insight:** Baseline mortality should be calculated from the population with **0% scenario adjustments**, not the adjusted population.

### Implementation

**File: `src/components/PopulationPyramid.jsx`**

```javascript
// Separate effect that runs ONLY when year changes (not scenarios)
useEffect(() => {
  async function computeBaselineMortality() {
    // CRITICAL: Get population with 0% scenarios
    const baselinePop = await applyScenarios(
      data, 
      { fertility: 0, mortality: 0, migration: 0 },  // ✅ 0% scenarios
      selectedYear
    );
    
    // Calculate mortality rate from this baseline population
    const baseline = await calculateGlobalMortalityRate(
      baselinePop,
      { fertility: 0, mortality: 0, migration: 0 }  // ✅ 0% adjustment
    );
    
    setBaselineMortality(baseline);
    console.log(`✓ Baseline mortality for ${selectedYear}: ${baseline.toFixed(2)} per 1000`);
  }
  
  computeBaselineMortality();
}, [selectedYear, data]);  // ✅ Only year and data, NOT scenarios
```

## Why This Works

### 1. Separate from scenario adjustments
```
Two independent effects:

Effect 1: Calculate adjusted population
  - Runs when: year OR scenarios change
  - Uses: current scenario values
  - Result: population shown in pyramid

Effect 2: Calculate baseline mortality
  - Runs when: year changes ONLY
  - Uses: 0% scenarios
  - Result: baseline mortality rate displayed
```

### 2. Uses 0% scenario population
```
User sets +20% mortality:
  
  Adjusted population (shown):
    - Age 65-69: 15/1000 × 1.2 = 18/1000 mortality
    - Age 100+: 150/1000 × 1.2 = 180/1000 mortality
    - Population structure altered by extra deaths
  
  Baseline population (for calculation):
    - Age 65-69: 15/1000 × 1.0 = 15/1000 mortality
    - Age 100+: 150/1000 × 1.0 = 150/1000 mortality
    - Original population structure
  
  Result:
    - Baseline stays at ~7.5/1000 ✅
    - Adjusted rate shows ~9.0/1000 ✅
```

### 3. Changes with year selection
```
Year 2025:
  Population: Younger structure (more working-age, fewer elderly)
  Age-specific rates: Same base rates
  Baseline mortality: ~7.2/1000 (weighted average)

Year 2050:
  Population: Older structure (more elderly, aging baby boomers)
  Age-specific rates: Same base rates
  Baseline mortality: ~8.5/1000 (weighted average higher)
```

Baseline changes because population age structure changes, NOT because rates change.

## How to Verify

### Test 1: Baseline changes with year
```bash
1. Open browser console
2. Select year 2025
3. Console should log: "✓ Baseline mortality for 2025: X.XX per 1000"
4. Move year slider to 2040
5. Console should log: "✓ Baseline mortality for 2040: Y.YY per 1000"
6. X.XX and Y.YY should be DIFFERENT
7. UI should update to show new baseline
```

### Test 2: Baseline independent of scenarios
```bash
1. Year 2030, all scenarios at 0%
2. Note baseline mortality: ~7.5/1000
3. Set mortality slider to +20%
4. Baseline should STAY ~7.5/1000 ✅
5. "Current Rate" should show ~9.0/1000 ✅
   (7.5 × 1.2 = 9.0)
```

### Test 3: Realistic values
```bash
1. Check baseline for 2025: Should be ~7-8 per 1000
2. Check baseline for 2050: Should be ~8-10 per 1000
3. Check baseline for 2100: Should be ~10-12 per 1000
   (population aging over time)
```

## What calculateGlobalMortalityRate Does

```javascript
export async function calculateGlobalMortalityRate(population, scenarios) {
  const mortalityMultiplier = 1 + scenarios.mortality / 100;
  
  let totalDeaths = 0;
  let totalPopulation = 0;

  // For each age group:
  for (let i = 0; i < 21; i++) {
    const malePop = population.male[i];
    const femalePop = population.female[i];

    // Get age-specific base rate
    const baseMaleMortalityPer1000 = mortalityRates.male[i];
    const baseFemaleMortalityPer1000 = mortalityRates.female[i];

    // Apply scenario adjustment (1.0 for baseline)
    const adjustedMale = baseMaleMortalityPer1000 × mortalityMultiplier;
    const adjustedFemale = baseFemaleMortalityPer1000 × mortalityMultiplier;

    // Calculate deaths for this cohort
    totalDeaths += malePop × (adjustedMale / 1000);
    totalDeaths += femalePop × (adjustedFemale / 1000);
    totalPopulation += malePop + femalePop;
  }

  // Global rate = weighted average
  return (totalDeaths / totalPopulation) × 1000;
}
```

**With 0% scenarios:** `mortalityMultiplier = 1.0`, so uses base rates.

**Result:** Weighted average of age-specific base rates for this population structure.

## Common Confusion

### "Why does baseline change with year?"

**Answer:** The base mortality RATES don't change, but the population age structure does.

```
Example:

Year 2025:
  0-19: 30% of population × 0.5/1000 = 0.15
  20-64: 50% of population × 3/1000 = 1.50
  65+: 20% of population × 25/1000 = 5.00
  Total: 6.65 per 1000 ✅

Year 2060 (population aged):
  0-19: 20% of population × 0.5/1000 = 0.10
  20-64: 40% of population × 3/1000 = 1.20
  65+: 40% of population × 25/1000 = 10.00
  Total: 11.30 per 1000 ✅

Same rates, different structure = different baseline
```

### "Why not just use a fixed rate like 7.5?"

**Answer:** Because it's not accurate for all years.

Canada's population is aging:
- 2025: Relatively young → baseline ~7-8/1000
- 2050: Aging boomers → baseline ~9-10/1000
- 2100: Very aged → baseline ~11-12/1000

Using fixed 7.5 would be wrong for most years.

## Files Changed

**`src/components/PopulationPyramid.jsx`**
- Added separate `computeBaselineMortality()` effect
- Runs only when year changes, not scenarios
- Gets baseline population with 0% scenarios
- Calculates baseline mortality from that population
- Logs result to console

## Expected Behavior

✅ Baseline mortality shows realistic value (~7-12 per 1000)
✅ Changes when year slider moves
✅ Does NOT change when scenario sliders move
✅ Console logs confirm calculation
✅ "Current Rate" = baseline × (1 + mortality%/100)

## Commit

[162fe57](https://github.com/thewondrfulwizrd/WA1/commit/162fe5753ace78a8ce8ba97577e6f0aa2ae5d332) - Fix baseline mortality to use 0% scenario population
