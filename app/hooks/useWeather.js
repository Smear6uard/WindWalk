import { useEffect, useState } from 'react';

const EMPTY_WEATHER = {
  wind_direction: null,
};

export default function useWeather() {
  const [weather, setWeather] = useState(EMPTY_WEATHER);

  useEffect(() => {
    let isActive = true;

    async function fetchWeather() {
      try {
        const response = await fetch('/api/weather');
        if (!response.ok) {
          throw new Error(`Weather request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (isActive) {
          setWeather({
            wind_direction:
              typeof data?.wind_direction === 'number' || typeof data?.wind_direction === 'string'
                ? data.wind_direction
                : null,
          });
        }
      } catch {
        if (isActive) {
          setWeather(EMPTY_WEATHER);
        }
      }
    }

    fetchWeather();
    return () => {
      isActive = false;
    };
  }, []);

  return weather;
}
