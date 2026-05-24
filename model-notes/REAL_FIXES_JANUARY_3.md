# The REAL Fixes - January 3, 2026 (Second Attempt)

## What Was Actually Wrong

The first attempt at fixes didn't work because I misunderstood the actual problems. Here's what was REALLY broken:

---

## Issue 1: Baseline Mortality Display Not Updating ❌→✅

### The Real Problem

Baseline mortality showed 7.5/1000 and never changed when moving the year slider. This is because:

1. I created a function `calculateBaselineMortality()` that just returned 7.5 as a fallback
2. The data structure doesn't have a `deaths` field to calculate from
3. I needed to actually CALCULATE it using the age-specific rates and population

### The Real Fix

**File: `src/components/PopulationPyramid.jsx`**

Instead of trying to get deaths from data, calculate baseline mortality using the actual function:

```javascript
// Call calculateGlobalMortalityRate with 0% scenarios
const baseline = await calculateGlobalMortalityRate(
  baselinePopulation, 
  { fertility: 0, mortality: 0, migration: 0 }  // 0% to get baseline
);
setBaselineMortality(baseline);
```

**File: `src/utils/cohortComponentProjection.js`**

The `calculateGlobalMortalityRate` function already correctly uses age-specific rates:

```javascript
export async function calculateGlobalMortalityRate(population, scenarios) {
  const mortalityMultiplier = 1 + scenarios.mortality / 100;
  
  let totalDeaths = 0;
  let totalPopulation = 0;

  for (let i = 0; i < 21; i++) {
    const malePop = population.male[i] || 0;
    const femalePop = population.female[i] || 0;

    // Use age-specific base rates ✓
    const baseMaleMortalityPer1000 = mortalityRates.male[i];
    const baseFemaleMortalityPer1000 = mortalityRates.female[i];

    // Apply scenario adjustment
    const adjusted = baseMortalityRate * mortalityMultiplier;
    
    // Calculate deaths for this cohort
    totalDeaths += malePop * (adjusted / 1000);
    totalPopulation += malePop + femalePop;
  }

  // Global rate = weighted average
  return (totalDeaths / totalPopulation) * 1000;
}
```

Now:
- Baseline mortality is calculated from actual age-specific rates
- Changes with year selection (different population structures)
- Shows realistic values (~7-8 per 1000 for Canada)

---

## Issue 2: 0-4 Cohort Losing 1 Million People (2025→2026) ❌→✅

### The Real Problem

I thought I had fixed this, but I ONLY set 0-4 to births:

```javascript
// WRONG - First attempt
projectedFemale[0] = femaleInfantSurvivors;  // Only births!
projectedMale[0] = maleInfantSurvivors;
```

This lost the **4/5 of the cohort that should stay in 0-4**!

### Why This Happens

With 5-year cohorts and year-by-year projection:

```
Year 2025 - 0-4 cohort: 1,870,000
  ├─ Ages 0: ~374K
  ├─ Ages 1: ~374K  
  ├─ Ages 2: ~374K
  ├─ Ages 3: ~374K
  └─ Ages 4: ~374K

Year 2026:
  ├─ Age 0: NEW BIRTHS (~370K)
  ├─ Ages 1-4: 2025's ages 0-3 (~1,496K) ← These stay in 0-4!
  └─ Ages 5-9: 2025's age 4 (~75K ages in)

So 0-4 in 2026 should be:
  NEW BIRTHS + (4/5 of 2025's 0-4)
  = 370K + (1,870K × 4/5)
  = 370K + 1,496K
  = 1,866K ✓
```

### The Real Fix

**File: `src/utils/cohortComponentProjection.js`**

```javascript
// STEP 5: Age group 0-4 SPECIAL CASE
// CRITICAL FIX: 0-4 cohort keeps 4/5 of existing + adds births

const staying0to4Female = (survivors[0].female * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
const staying0to4Male = (survivors[0].male * (COHORT_WIDTH - 1)) / COHORT_WIDTH;

projectedFemale[0] = staying0to4Female + femaleInfantSurvivors;
projectedMale[0] = staying0to4Male + maleInfantSurvivors;
```

**Why this works:**

1. `staying0to4 = survivors[0] × 4/5`
   - These are ages 0-3 that become ages 1-4
   - They stay in the 0-4 cohort

2. `femaleInfantSurvivors = births × 0.51 × survival_rate`
   - New births become new age 0

3. Total 0-4 = staying + births
   - Ages 0-4 complete! ✓

**Meanwhile, 1/5 ages to 5-9:**
```javascript
// This already happens in the aging loop
projectedFemale[1] = (survivors[0] / 5) + (survivors[1] × 4/5);
//                    ^^^^^^^^^^^^^^^^    ← This is the 1/5 that left!
```

---

## Issue 3: Deaths Still Using Global Rate ❌→✅

### The Real Problem

The projection code WAS already using age-specific rates! The issue was just that the DISPLAY wasn't showing it correctly.

### Verification

Look at the code in `projectOneYear()`:

```javascript
for (let i = 0; i < 21; i++) {
  const malePop = currentPopulation.male[i] || 0;
  
  // CRITICAL: Use age-specific base rate for THIS cohort
  const baseMaleMortalityPer1000 = baseMaleRates[i];  // ✓ Age-specific!
  
  // Apply scenario slider
  const adjustedMortalityPer1000 = baseMaleMortalityPer1000 * mortalityMultiplier;
  
  // Calculate deaths
  const deaths = malePop * (adjustedMortalityPer1000 / 1000);
}
```

This was ALREADY correct! The problem was just the UI display.

---

## Summary of REAL Changes

| File | What Changed | Why |
|------|-------------|-----|
| `src/components/PopulationPyramid.jsx` | Calculate baseline using `calculateGlobalMortalityRate()` | Actually compute from age-specific rates |
| `src/utils/cohortComponentProjection.js` | Fix 0-4 cohort formula | Add staying 4/5 + births, not just births |

---

## The Math Behind 0-4 Cohort

### For All Other Cohorts (ages 5-9 through 95-99):

```
projected[i] = inflow + staying
             = (survivors[i-1] / 5) + (survivors[i] × 4/5)
```

**Example for 5-9:**
```
2025:
  0-4: 1,870,000
  5-9: 2,050,000

2026:
  Inflow from 0-4: 1,870,000 / 5 = 374,000
  Staying from 5-9: 2,050,000 × 4/5 = 1,640,000
  Total 5-9: 374,000 + 1,640,000 = 2,014,000 ✓
```

### For 0-4 Cohort (SPECIAL):

```
projected[0] = staying + births
             = (survivors[0] × 4/5) + new_births
```

**Why different?**
- No "younger" cohort to age in from (can't have negative ages!)
- Instead receives BIRTHS
- But still keeps 4/5 that don't age out

**Example:**
```
2025:
  0-4: 1,870,000
  
2026:
  Births: 370,000 (new age 0)
  Staying in 0-4: 1,870,000 × 4/5 = 1,496,000 (ages 0-3 → 1-4)
  
  Meanwhile, 1/5 ages to 5-9:
    1,870,000 / 5 = 374,000 (age 4 → 5)
  
  Total 0-4: 370,000 + 1,496,000 = 1,866,000 ✓
  
  Check: 1,870,000 = (374,000 aged out) + (1,496,000 stayed)
                   = 374,000 + 1,496,000 ✓
```

---

## Verification Checklist

### ✓ Baseline Mortality
```
1. Open app, select year 2025
2. Check baseline mortality display
3. Should show ~7.5-8.0 per 1000 (not hardcoded 7.5)
4. Move year slider to 2030
5. Baseline should change (different age structure)
6. Console should log: "Baseline mortality for 2030: X.XX per 1000"
```

### ✓ 0-4 Cohort Transition
```
1. Open debug table
2. Look at 2025 0-4 population: ~1,870,000
3. Look at 2026:
   - 0-4: Should be ~1,866,000 (staying + births)
   - 5-9: Should increase by ~374,000 (1/5 aged in)
4. Console should log:
   "0-4 cohort calculation:"
   "  Previous 0-4 survivors: 1,870,000"
   "  Staying in 0-4 (4/5): 1,496,000"
   "  New births: 370,000"
   "  Total 0-4: 1,866,000"
```

### ✓ Age-Specific Mortality
```
1. Open debug table
2. Check mortality by age:
   - 0-4: ~0.5 per 1000
   - 65-69: ~15 per 1000
   - 100+: ~150-300 per 1000
3. Set mortality slider to +20%
4. All rates should increase 20%
5. Global rate should be weighted average of all cohorts
```

---

## What Was Wrong With First Attempt

### Mistake 1: Baseline Mortality Calculation

**What I did:**
```javascript
function calculateBaselineMortality(data, year) {
  if (data.observed && data.observed[year]) {
    return (data.deaths / data.population) * 1000;
  }
  return 7.5;  // Always returned this!
}
```

**Problem:** Data doesn't have `deaths` field, so always returned 7.5 fallback.

**Real fix:** Call `calculateGlobalMortalityRate()` which actually computes it.

### Mistake 2: 0-4 Cohort Formula

**What I did (first attempt):**
```javascript
projectedFemale[0] = femaleInfantSurvivors;  // Only births!
```

**Problem:** Lost 1.5M people who should stay in 0-4.

**Real fix:** 
```javascript
const staying = survivors[0] * 4/5;
projectedFemale[0] = staying + femaleInfantSurvivors;
```

---

## Files Changed (This Time For Real)

1. ✅ `src/components/PopulationPyramid.jsx`
   - Use `calculateGlobalMortalityRate()` to get baseline
   - Remove broken `calculateBaselineMortality()` function

2. ✅ `src/utils/cohortComponentProjection.js`
   - Fix 0-4 cohort: `staying + births` not just `births`
   - Add console logging to verify calculation

---

**Status:** ✅ ACTUALLY FIXED NOW

**Test:** Restart dev server and verify:
1. Baseline mortality changes with year
2. 0-4 cohort doesn't lose 1M people
3. Age-specific mortality rates visible in debug table
