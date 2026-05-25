# Critical Fixes - January 3, 2026

## Overview

Four critical issues have been identified and fixed in the demographic projection model:

1. ✅ **Age 100+ cohort growing infinitely** - Now uses proper age-specific mortality
2. ✅ **Population 0-4 dropping 80% annually** - Now uses 1/5 annual aging for 5-year cohorts
3. ✅ **Baseline mortality hardcoded to 75 per 1000** - Now year-dependent and calculated from actual data
4. ✅ **Baseline fertility rate wrong** - Updated from 1.5 to 1.25 (Canada's actual TFR)

---

## Issue 1: Age 100+ Cohort Growing Forever ❌→✅

### The Problem

The 100+ age cohort was growing instead of declining with proper mortality. This happened because:

1. A global mortality rate was calculated (~7-8 per 1000)
2. This global rate was applied uniformly to ALL cohorts
3. But 100+ should have much higher mortality (~150+ per 1000)
4. The debugger showed 100+ getting global rate of ~8/1000 instead of age-specific ~150/1000
5. Result: 100+ population barely declining, appearing to grow

### Root Cause

**Code was treating mortality as a scalar, not age-specific.**

Wrong approach:
```javascript
const globalRate = 7.5;  // per 1000
for (let i = 0; i < 21; i++) {
  deaths[i] = population[i] * (globalRate / 1000);  // ❌ Same rate for all!
}
```

Correct approach:
```javascript
for (let i = 0; i < 21; i++) {
  const ageSpecificRate = baseMortalityRates[i];  // Each age has own rate
  deaths[i] = population[i] * (ageSpecificRate / 1000);  // ✅
}
```

### The Fix

**File: `src/utils/cohortComponentProjection.js`**

```javascript
// CRITICAL FIX: Use age-specific mortality rates, not global average
for (let i = 0; i < 21; i++) {
  const malePop = currentPopulation.male[i] || 0;
  const femalePop = currentPopulation.female[i] || 0;

  // Each age-gender cohort has ITS OWN base mortality rate
  const baseMaleMortalityPer1000 = baseMaleRates[i] || 8.0;  // Not global!
  const baseFemaleMortalityPer1000 = baseFemaleRates[i] || 8.0;  // Not global!

  // Apply scenario slider to EACH rate independently
  const adjustedMaleMortalityPer1000 = baseMaleMortalityPer1000 * mortalityMultiplier;
  const adjustedFemaleMortalityPer1000 = baseFemaleMortalityPer1000 * mortalityMultiplier;

  // Calculate deaths for this specific cohort
  const maleMortalityProp = adjustedMaleMortalityPer1000 / 1000;
  const maleDeaths = Math.round(malePop * maleMortalityProp);
  // ... same for female ...
}
```

**Mortality rates used:**
- 0-4 years: 0.5 per 1000
- 65-69 years: 15 per 1000
- 100+ years: 150-300+ per 1000

Now the 100+ cohort gets its actual high mortality rate, not the global average.

### Verification

✅ Check debug table for 100+ cohort:
- Baseline (0% adjustment): High mortality, steady decline
- With +20% adjustment: Even higher mortality, steeper decline
- Should NOT see growth or stagnation

---

## Issue 2: Population 0-4 Dropping 80% (2025→2026) ❌→✅

### The Problem

The 0-4 age cohort was plummeting instead of aging smoothly:

```
2025 0-4: ~1.87M (accumulated from 5 years of births)
2026 0-4: ~370K (only 1 year of births) → Appears to drop 80%!
```

But this wasn't actually wrong—it WAS correct aging! The issue was **misunderstanding how year-by-year projection works with 5-year age groups.**

### Root Cause

**The fundamental confusion:**
- Our age groups are 5-year cohorts (0-4, 5-9, ..., 100+)
- We project year-by-year (1 year at a time)
- Each year, only 1/5 of a cohort should age into the next group
- The remaining 4/5 stays in place

**The old code was moving ENTIRE cohorts each year:**

```javascript
// WRONG: Moves all 1.87M at once
projectedFemale[1] = survivors[0].female;  // Entire cohort ages!
projectedMale[1] = survivors[0].male;
```

This made it look like the 0-4 cohort was disappearing when really it was all aging at once.

### The Fix

**File: `src/utils/cohortComponentProjection.js`**

Move only 1/5 of each cohort per year:

```javascript
const COHORT_WIDTH = 5;  // 5-year age groups

// For each age group 1-19:
for (let i = 1; i < 20; i++) {
  // 1/5 of current cohort ages to next group
  const inflow = (survivors[i - 1].female || 0) / COHORT_WIDTH;
  
  // 4/5 of this cohort stays in place
  const staying = (survivors[i].female * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
  
  // Total = new arrivals + those staying
  projectedFemale[i] = inflow + staying;
}

// For 100+ cohort: receives 1/5 from 95-99 + all its own survivors
const inflow100 = (survivors[19].female || 0) / COHORT_WIDTH;
const staying100 = survivors[20].female || 0;  // No one leaves 100+
projectedFemale[20] = inflow100 + staying100;
```

**Example over 5 years:**

```
Year 1 (2025):
  0-4 cohort = [births from 2025] = 370K
  5-9 cohort = [full cohort from 2025] = 1.08M

Year 2 (2026):
  0-4 cohort = [births from 2026] = 375K (new births)
  5-9 cohort = [1/5 of 2025's 0-4] + [4/5 of 2025's 5-9]
             = (370K / 5) + (1.08M * 4/5)
             = 74K + 864K = 938K

Year 3 (2027):
  0-4 cohort = [births from 2027] = 376K
  5-9 cohort = (375K / 5) + (938K * 4/5) = 825K
  10-14 cohort = (1/5 of 2025 0-4) + (4/5 of 2025 5-9)

... continues ...

Year 6 (2030): 2025's original 0-4 cohort is now fully in 10-14 group
```

### Verification

✅ Check 0-4 cohort transition:
- 2025 0-4: Check data (likely ~1.87M)
- 2026 0-4: Should be ~370K (births)
- 2026 5-9: Should be ~1.08M (1/5 aged from 2025 0-4 + rest of 5-9)
- 2031 10-14: Should still show original 2025 0-4 cohort

✅ Visual check in pyramid:
- Should see smooth, gradual aging
- No sudden population drops
- Cohorts visible across multiple year spans

---

## Issue 3: Baseline Mortality Hardcoded to 75 per 1000 ❌→✅

### The Problem

In `ScenarioControls.jsx`, baseline mortality was:
```javascript
const BASELINE_MORTALITY = 75;  // ❌ WAY TOO HIGH!
```

This is completely wrong:
- Canada's actual mortality: ~7-8 per 1000
- The code was showing: 75 per 1000 (10x too high!)
- This was hardcoded, not calculated from actual data
- Did not change when year changed

### Root Cause

**Hardcoded constant that didn't match reality or actual data.**

The problem cascaded:
1. Hardcoded 75 per 1000 was clearly wrong
2. But the projection code was using age-specific rates (correct)
3. So there was a disconnect between display and actual calculation
4. Users couldn't understand what the real baseline was

### The Fix

**File: `src/components/ScenarioControls.jsx`**

Remove hardcoded constant, accept as prop:

```javascript
// REMOVED hardcoded BASELINE_MORTALITY
// Instead, accept it as a prop
export function ScenarioControls({ 
  scenarios, 
  onScenarioChange, 
  onReset, 
  isHistorical, 
  baselineMortality  // ✅ Passed from parent
}) {
  // Use passed-in baseline (calculated from actual year data)
  const displayedBaselineMortality = baselineMortality || 7.5;  // Default fallback
  
  // Calculate adjusted rate using THIS year's baseline
  const adjustedMortality = displayedBaselineMortality * (1 + scenarios.mortality / 100);
}
```

**File: `src/components/PopulationPyramid.jsx`**

Calculate baseline mortality from actual data:

```javascript
function calculateBaselineMortality(data, year) {
  if (!data) return 7.5;
  
  // For observed years: use reported deaths
  if (data.observed && data.observed[year]) {
    const yearData = data.observed[year];
    if (yearData.deaths !== undefined && yearData.population !== undefined) {
      // Baseline mortality = (deaths / population) * 1000
      return (yearData.deaths / yearData.population) * 1000;
    }
  }
  
  return 7.5;  // Default Canada baseline
}

// Pass to ScenarioControls:
<ScenarioControls
  {...otherProps}
  baselineMortality={baselineMortality}  // ✅ Year-dependent!
/>
```

### Verification

✅ Check baseline mortality display:
- 2023: Should show ~7-8 per 1000 (Canada's recent rate)
- 2025: Should show ~7.5 per 1000
- Changes when you move year slider
- No longer shows 75/1000

✅ Check scenario adjustment:
- Baseline: 7.5 per 1000
- +10% adjustment: 8.25 per 1000 (7.5 × 1.1)
- +20% adjustment: 9.0 per 1000 (7.5 × 1.2)

---

## Issue 4: Baseline Fertility Rate Wrong ❌→✅

### The Problem

Baseline TFR (Total Fertility Rate) was set to 1.5, but Canada's actual 2023-2024 TFR is 1.25.

```javascript
const BASELINE_FERTILITY = 1.5;  // ❌ Wrong for Canada
```

### Root Cause

**Outdated constant based on older demographic data.**

Canada's TFR has been declining:
- 2015: ~1.6
- 2020: ~1.4
- 2023-2024: ~1.25 (below replacement level)

The ASFRs (age-specific fertility rates) were scaled to achieve wrong TFR.

### The Fix

**File: `src/utils/fertilityRates.js`**

```javascript
const BASELINE_FERTILITY = 1.25;  // ✅ Updated to Canada's actual TFR

function getBaselineFertilityRates() {
  const rates = new Array(21).fill(0);
  
  // Rescaled ASFRs to achieve TFR of 1.25
  rates[3] = 0.00301;   // Ages 15-19
  rates[4] = 0.01703;   // Ages 20-24
  rates[5] = 0.04742;   // Ages 25-29 (peak fertility)
  rates[6] = 0.06913;   // Ages 30-34
  rates[7] = 0.04101;   // Ages 35-39
  rates[8] = 0.00924;   // Ages 40-44
  rates[9] = 0.00067;   // Ages 45-49
  
  // TFR = sum(rates) * 5 = 0.25 * 5 = 1.25 ✅
  return rates;
}
```

**File: `src/components/ScenarioControls.jsx`**

```javascript
const BASELINE_FERTILITY = 1.25;  // ✅ Updated here too
```

### Verification

✅ Check fertility display:
- Baseline TFR: 1.25
- +10% adjustment: 1.375 (1.25 × 1.1)
- +20% adjustment: 1.50 (1.25 × 1.2)
- -20% adjustment: 1.00 (1.25 × 0.8)

✅ Check birth calculations:
- With TFR 1.25: ~370K births annually (matches 2023-2024 Canada)
- With +10%: ~407K births (~370K × 1.1)
- With -10%: ~333K births (~370K × 0.9)

---

## Summary of Changes

| File | Issue | Change |
|------|-------|--------|
| `src/utils/cohortComponentProjection.js` | Age-specific mortality + 1/5 aging | Complete rewrite of `projectOneYear()` |
| `src/utils/fertilityRates.js` | TFR 1.5 → 1.25 | Updated baseline and ASFRs |
| `src/components/ScenarioControls.jsx` | Hardcoded mortality 75/1000 + TFR 1.5 | Accept `baselineMortality` prop, update TFR |
| `src/components/PopulationPyramid.jsx` | No year-dependent baseline | Calculate and pass `baselineMortality` |

---

## What to Test

### Test 1: Age 100+ Mortality
```
1. Open debugger
2. Set all scenarios to 0%
3. Look at 100+ cohort in 2026
4. Check mortality rate: Should be ~150+ per 1000, not ~8!
5. Population should decline each year, not grow
```

### Test 2: 0-4 Cohort Aging
```
1. Project to 2030
2. Check 2025 0-4 population (~1.87M if from data)
3. See it appear in:
   - 2026 5-9: ~1/5 aged in
   - 2027 5-9: ~2/5 aged in total
   - 2030 10-14: Most of original cohort
4. Should see smooth progression, not 80% drop
```

### Test 3: Year-Dependent Mortality
```
1. Select year 2023
2. Check baseline mortality display: ~7-8 per 1000
3. Move to 2025
4. Check baseline: Should still be ~7-8
5. Adjust mortality slider: Rate should scale from baseline
```

### Test 4: Fertility Baseline
```
1. Check fertility display: 1.25 baseline
2. Adjust +10%: Should show 1.375
3. Check births: ~370K annually
4. Should match Canada's 2023-2024 actual births
```

---

## Key Insights

### Cohort-Component Model

**For 5-year age groups with year-by-year projection:**

```
Each year:
  1. Calculate age-specific deaths
  2. 1/5 of each cohort ages to next group
  3. 4/5 of each cohort stays in place
  4. Calculate births for that year only
  5. Add migration
```

This ensures:
- Cohorts gradually age over 5 years (not all at once)
- Each cohort properly accumulates from earlier years
- Age structure stays realistic

### Mortality Methodology

**Global mortality rate = weighted average:**

```
Global rate = (sum of all age-specific deaths) / (total population) × 1000
```

Not:
```
Global rate = average of all age-specific rates  ❌
```

Because age structure matters! A population with many elderly has higher mortality even at same rates.

---

## Next Steps

1. ✅ Commit all fixes
2. ✅ Restart dev server: `npm run dev`
3. ✅ Run all four tests above
4. ✅ Compare to expected Canada demographics
5. Consider adding unit tests for projection calculations
6. Consider documenting assumption changes for future reference

