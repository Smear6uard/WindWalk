import { useEffect, useState } from 'react';

const EMPTY_ROUTES = {
  shortest: [],
  comfort: [],
};

function hasCoordPair(coord) {
  return Array.isArray(coord) && coord.length === 2 && coord.every((v) => typeof v === 'number');
}

export default function useRoutes(origin, destination) {
  const [routes, setRoutes] = useState(EMPTY_ROUTES);

  useEffect(() => {
    let isActive = true;

    async function fetchRoutes() {
      if (!hasCoordPair(origin) || !hasCoordPair(destination)) {
        if (isActive) {
          setRoutes(EMPTY_ROUTES);
        }
        return;
      }

      try {
        const response = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination }),
        });

        if (!response.ok) {
          throw new Error(`Route request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (isActive) {
          setRoutes({
            shortest: Array.isArray(data?.shortest) ? data.shortest : [],
            comfort: Array.isArray(data?.comfort) ? data.comfort : [],
            pedway: Array.isArray(data?.pedway) ? data.pedway : [],
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
  }, [origin?.[0], origin?.[1], destination?.[0], destination?.[1]]);

  return routes;
}
