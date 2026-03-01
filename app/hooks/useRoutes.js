import { useEffect, useState } from 'react';
import { API_URL } from '../constants/config';

const EMPTY_ROUTES = {
  shortest: null,
  comfort: null,
};

function hasCoordPair(coord) {
  return Array.isArray(coord) && coord.length === 2 && coord.every((v) => typeof v === 'number');
}

export default function useRoutes(origin, destination, options = {}) {
  const { enabled = true } = options;
  const [routes, setRoutes] = useState(EMPTY_ROUTES);

  useEffect(() => {
    let isActive = true;

    async function fetchRoutes() {
      if (!enabled) {
        if (isActive) {
          setRoutes(EMPTY_ROUTES);
        }
        return;
      }

      if (!hasCoordPair(origin) || !hasCoordPair(destination)) {
        if (isActive) {
          setRoutes(EMPTY_ROUTES);
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          origin_lat: origin[0].toString(),
          origin_lng: origin[1].toString(),
          dest_lat: destination[0].toString(),
          dest_lng: destination[1].toString(),
        });

        const response = await fetch(`${API_URL}/api/route?${params}`);

        if (!response.ok) {
          throw new Error(`Route request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (isActive) {
          setRoutes({
            shortest: data?.shortest ?? null,
            comfort: data?.comfort ?? null,
          });
        }
      } catch {
        if (isActive) {
          setRoutes(EMPTY_ROUTES);
        }
      }
    }

    fetchRoutes();
    return () => {
      isActive = false;
    };
  }, [destination?.[0], destination?.[1], enabled, origin?.[0], origin?.[1]]);

  return routes;
}
