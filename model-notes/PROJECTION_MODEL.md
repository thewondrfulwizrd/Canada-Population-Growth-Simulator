# Cohort-Component Projection Model

## Overview

The population projection model implements a proper **cohort-component projection model** that simulates realistic demographic dynamics using established demography best practices.

## How It Works

### 1. Mortality (Deaths) - CORRECTED

**Key Principle:** Each age-gender cohort has its own independent base mortality rate. The scenario slider adjusts ALL rates proportionally.

**Input:** User's mortality slider (-100% to +100%)

**Process:**
- **Base rates by age/gender:** Loaded from 2023 Statistics Canada data (21 age groups × 2 genders)
- **Each cohort's adjusted rate:** `base_rate × (1 + mortality%/100)`
  - Positive % = higher mortality (more deaths in all age groups)
  - Negative % = lower mortality (better survival across all ages)
- **Deaths calculated:** `population × (adjusted_rate / 1000)` for each cohort independently
- **Global mortality rate:** Calculated AFTER summing all cohort deaths
  - Formula: `(total_deaths / total_population) × 1000`
  - This is derived from deaths, not applied globally

**Example:**
```
Base rates (per 1000):
  Males 0-4: 0.5      Females 0-4: 0.4
  Males 65-69: 15     Females 65-69: 10
  Males 100+: 300     Females 100+: 250

Scenario: mortality +10%
  Adjusted Males 0-4: 0.5 × 1.10 = 0.55
  Adjusted Males 65-69: 15 × 1.10 = 16.5
  Adjusted Males 100+: 300 × 1.10 = 330

Result: Young cohorts have slightly higher death rates,
        elderly cohorts have proportionally higher rates
        Global rate is weighted by population structure
```

### 2. Fertility (Births) - CORRECTED

**Input:** User's fertility slider (-100% to +100%)

**Process:**
- Base Total Fertility Rate (TFR): 1.5 children per woman
- Adjusted TFR: `1.5 × (1 + fertility%/100)`
- **Age-Specific Fertility Rates (ASFR):** Calculated for 5-year age groups (15-49)
  - Births = Σ(female_pop_in_age_group × ASFR_for_group)
- **Annual births calculated once** for one calendar year
- Births split 51% female, 49% male

**Key Point:** Since we project year-by-year, exactly 1 year of births is added to the 0-4 cohort each year. Over a 5-year period, this cohort accumulates births from 5 years.

**Example:**
```
Year 2025: Births = 370,000
  Female 0-4 += 188,700
  Male 0-4 += 181,300

Year 2026: Births = 375,000 (scenario adjusted up)
  Female 0-4 += 191,250
  Male 0-4 += 183,750

After 5 years of projections, 0-4 cohort contains
5 years of accumulated births (while aging occurs)
```

### 3. Migration (Net Migration)

**Input:** User's migration slider (-100% to +100%)

**Process:**
- **Base net migration:** 400,000 people annually
- **Adjusted total:** `400,000 × (1 + migration%/100)`
- **Distribution by age/gender:** Based on 2024/2025 actual migration patterns
  - Immigrants by age group (Statistics Canada)
  - Non-permanent residents by age group
  - Emigration by age group
  - Net = Immigrants + Non-permanent - Emigration
- **Shares:** Each age-gender cohort gets its proportional share
- Migrants are added to each cohort after aging and mortality

**Example:**
```
Base net migration: 400,000
Scenario: migration +50%
Adjusted: 400,000 × 1.50 = 600,000
Males 20-24 historical share: 8.5%
Males 20-24 receive: 600,000 × 0.085 = 51,000
```

## Year-by-Year Projection

For each year from 2026 onwards:

```
1. Calculate deaths for each age-gender cohort:
   deaths[i] = pop[i] × (base_rate × multiplier) / 1000

2. Calculate survivors:
   survivors[i] = pop[i] - deaths[i]

3. Age cohorts forward by 5-year groups:
   projected[1] = survivors[0]  // 0-4 → 5-9
   projected[2] = survivors[1]  // 5-9 → 10-14
   ...
   projected[20] = survivors[19] + survivors[20]  // 100+ cohort adds survivors

4. Calculate births from reproductive-age females:
   births = Σ(female_pop[age] × ASFR[age]) for ages 15-49

5. Add births to age 0-4 cohort:
   projected[0] = births × 0.51 (female), births × 0.49 (male)

6. Distribute migrants across all cohorts

7. Result: Population for next year
```

## Critical Fixes (January 2026)

### Fix #1: Age-Specific Mortality
- ✅ **Before:** Global mortality applied uniformly to all cohorts
- ✅ **Now:** Each age-gender cohort uses its own base rate × scenario multiplier
- ✅ **Result:** Global mortality rate is derived from cohort deaths, not applied globally

### Fix #2: Oldest Cohort (100+ years)
- ✅ **Before:** 100+ cohort was set to 0 (population lost)
- ✅ **Now:** 100+ cohort ages INTO itself
  - Receives aged 95-99 cohort survivors
  - Retains its own survivors
  - Formula: `projected[20] = survivors[19] + survivors[20]`

### Fix #3: Birth Accumulation
- ✅ **Before:** Only 1 year of births added to 5-year cohort, causing undercount
- ✅ **Now:** 1 year of births added annually, cohort accumulates over 5 years
- ✅ **Result:** Realistic population structure as cohort ages

## Technical Implementation

### Files

**`cohortComponentProjection.js`** - Core projection engine
- `projectOneYear()` - Project forward one calendar year
  - Calculates age-specific deaths for each cohort
  - Ages cohorts forward by 5-year groups
  - Retains 100+ cohort population
  - Adds annual births to 0-4 cohort
  - Distributes migration by age-gender shares
- `projectToYear()` - Project to target year with caching
- `calculateGlobalMortalityRate()` - Compute from cohort deaths

**`mortalityRates.js`** - Mortality data loader
- Loads 2023 age-gender mortality rates from Base_Mortality.csv
- Provides per-cohort rates for calculations
- Format: per 1000 population for each age/gender

**`migrationDistribution.js`** - Migration data loader
- Loads 2024/2025 migration by age-gender
- Calculates proportional shares for distribution

**`fertilityRates.js`** - Fertility calculator
- Computes age-specific fertility rates (ASFR) from base TFR
- Adjusts for scenario slider
- Provides rates for reproductive ages (15-49)

**`scenarioCalculations.js`** - Integration layer
- `applyScenarios()` - Routes to cohort-component model for projections
- `getGlobalMortalityRate()` - Calculates from component model

### Caching

Projections are cached to avoid recalculating when sliders change within the same year.
Cache key: `${targetYear}_${JSON.stringify(scenarios)}`
Cache is cleared when scenarios change significantly.

## Key Assumptions

1. **Fixed fertility pattern:** TFR-based ASFR. Real flows vary with economic conditions.
2. **Fixed migration distribution:** Uses 2024/2025 patterns. Real migration changes with policy and economics.
3. **No interprovincial migration:** Assumes all migration is international.
4. **No marriage/partnership modeling:** Births estimated from total reproductive-age females.
5. **Constant scenario adjustments:** Sliders apply indefinitely (no policy changes).
6. **5-year age groups:** Population aged in 5-year cohorts to match census structure.
7. **Annual projection steps:** Year-by-year increases computational cost but improves accuracy.

## Data Sources

- **Mortality rates:** Statistics Canada Table 13-10-038, 2023 data by age and sex (per 1000)
- **Migration patterns:** Statistics Canada, 2024/2025 fiscal year by age and sex (absolute numbers)
- **Base population:** 2025 observed pyramid from census and projection data
- **Fertility:** Baseline TFR 1.5 (typical for Canada)
- **Births/Deaths:** Statistics Canada annual vital statistics

## Validation Checklist

- [ ] 2026 projection with 0% scenarios matches expected growth
- [ ] Cohort survival rates reasonable (80%+ young, 90%+ elderly)
- [ ] Global mortality rate ~7-8 per 1000 for Canada (baseline)
- [ ] +10% mortality → global rate increases proportionally
- [ ] +20% fertility → births increase ~20%
- [ ] Oldest cohort (100+) population retained year-to-year
- [ ] 0-4 cohort accumulates births over 5-year period
- [ ] Death counts sum correctly to global mortality rate
- [ ] Annual change = births - deaths + migration (component accounting)
