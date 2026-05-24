// src/hooks/usePopulationData.js
import { useState, useEffect } from 'react';

export function usePopulationData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/canada_age_sex_observed_projected_2000_2100_v2.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(jsonData => {
        // Validate data structure
        if (!jsonData.observed || !jsonData.projected || !jsonData.ages) {
          throw new Error('Invalid data structure: missing observed, projected, or ages');
        }
        
        if (!jsonData.yearsObserved || !jsonData.yearsProjected) {
          throw new Error('Invalid data structure: missing yearsObserved or yearsProjected');
        }
        
        setData(jsonData);
        setLoading(false);
        console.log('✓ Data loaded successfully');
        console.log(`  Observed years: ${jsonData.yearsObserved[0]}-${jsonData.lastObservedYear}`);
        console.log(`  Projected years: ${jsonData.yearsProjected[0]}-${jsonData.lastProjectedYear}`);
        console.log(`  Age groups: ${jsonData.ages.length}`);
        console.log(`  Data structure validated: has 'observed' and 'projected' objects`);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
        console.error('✗ Failed to load data:', err);
      });
  }, []);

  return { data, loading, error };
}