# WindWalk

**Weather-aware pedestrian routing for Chicago's Loop.** WindWalk helps you find the warmest, most comfortable walking route between two points—prioritizing Chicago's underground Pedway system and street-level paths that minimize wind exposure.

---

## Overview

Chicago's winters are brutal. Wind chill can make a short walk feel dangerous. WindWalk solves this by:

1. **Modeling street-level wind amplification** — Urban canyons (tall buildings, narrow streets) channel wind. We compute how much worse the wind feels on each street segment based on geometry and orientation.
2. **Integrating the Chicago Pedway** — The underground Pedway network offers climate-controlled indoor walking. We include real Pedway segments and stitch them to the street network.
3. **Computing two route options** — **Shortest** (minimum distance) and **Comfort** (minimum wind-weighted cost). The Comfort route favors Pedway segments and streets aligned perpendicular to the wind.
4. **Using live weather** — Wind direction and speed from OpenWeatherMap drive the routing. When the API is unavailable, we fall back to mock data for development.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Native   │     │  FastAPI Backend  │     │  External APIs  │
│  (Expo) App     │────▶│  (Python)         │────▶│  OpenWeatherMap │
│                 │     │     │             │     │  Mapbox (opt)   │
│  - SearchPanel  │     │     │             │     └─────────────────┘
│  - MapContainer │     │     ▼             │
│  - RouteCards   │     │  NetworkX Graph  │     ┌─────────────────┐
│  - WeatherBar   │     │  (wind + pedway)  │     │  Local Data      │
└─────────────────┘     └──────────────────┘     │  wind_amplif.   │
        │                          │              │  pedway_network │
        │                          │              └─────────────────┘
        └──────────────────────────┘
```

- **Frontend**: React Native (Expo) with Leaflet for web map, React Native Maps for mobile.
- **Backend**: FastAPI on Python 3.11+, NetworkX for graph algorithms.
- **Data**: `data/wind_amplification.json` (street segments + wind amplification), `data/pedway_network.json` (Pedway segments).

---

## Algorithms

### 1. Wind Amplification Model

Street-level wind is amplified by urban canyon geometry. **Aspect ratio** (building height / street width) and **segment orientation** determine how much wind is channeled when it blows from a given direction.

- **Source**: `scripts/p1_build_wind_model.py` uses OpenStreetMap streets and Chicago building footprints to compute:
  - Segment orientation (degrees from North)
  - Average building height (from GeoJSON or default 15 m)
  - Street width (default 20 m)
  - **Aspect ratio** = height / width
- **Output**: `wind_amplification.json` — each segment has `amplification_by_direction` for 16 compass directions (N, NNE, NE, E, …). Values range from 1.0 (no amplification) to 2.5 (capped for safety).
- **Physical reasoning**: Wind aligned with the street axis (Venturi effect) is amplified; cross-street winds are reduced.

### 2. Wind Chill & Edge Weight

For each outdoor edge, we compute:

- **Effective wind** = `wind_speed_mph × amplification[direction]`
- **Feels-like** = NWS wind chill formula: `35.74 + 0.6215×T - 35.75×V^0.16 + 0.4275×T×V^0.16` (where V = effective wind)
- **Edge cost** = `distance × (1.0 + (32 - feels_like) / 20)` when feels_like < 32°F, capped at 3×. Otherwise cost = distance.

Pedway edges get a fixed **0.3× distance** cost (indoor, ~65°F).

### 3. Routing

- **Shortest path**: Dijkstra’s algorithm with `weight = distance`.
- **Comfort path**: Dijkstra’s algorithm with `weight = compute_edge_weight(...)` (wind-weighted cost).
- **Snapping**: User origin/destination are snapped to the nearest graph node. If the snapped point is >15 m from the requested point, we add a connector leg to the actual coordinates.
- **Graph**: Built from `wind_amplification.json` (street segments) + `pedway_network.json` (Pedway segments). Pedway nodes are stitched to the nearest street node within 100 m. Disconnected components are bridged with edges up to 120 m.

### 4. CTA Transfer Tunnels

CTA transfer tunnels (e.g., Jackson Red–Blue) require a fare. We include them **only when both origin and destination are within 80 m of a CTA/Metra station**. Otherwise we use the graph without fare-required tunnels.

---

## Data Sources

| Data | Source | Purpose |
|------|--------|---------|
| Street segments | OpenStreetMap (Overpass API) | Street geometry for wind model |
| Building footprints | Chicago Data Portal | Building height for aspect ratio |
| Pedway network | Curated `pedway_network.json` | Underground tunnel segments |
| Transit stations | Hardcoded in `transit_stations.py` | CTA L and Metra Loop stations |
| Weather | OpenWeatherMap One Call API 3.0 | Wind speed, direction, temp |
| Geocoding | Mapbox (optional) or fallback | Address search |

### Data Pipeline Scripts

- **`scripts/p1_download_data.py`** — Fetches OSM streets and Chicago buildings, clips to Loop bbox.
- **`scripts/p1_build_wind_model.py`** — Computes wind amplification from geometry, outputs `wind_amplification.json`.
- **`scripts/p3_build_pedway.py`** — Validates `pedway_network.json` and generates a validation report.

---

## Geocoding & Search

- **Empty query**: Returns all suggested places (landmarks, CTA/Metra stations, DePaul buildings). User sees a dropdown on focus.
- **With Mapbox token**: Calls Mapbox Geocoding API (Loop bbox). Results are merged with `SUGGESTED_PLACES` matches — curated places (e.g., DePaul Center, Lewis Center) are prioritized and shown first.
- **Without Mapbox or on error**: Substring match on `SUGGESTED_PLACES` only.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/weather` | GET | Current weather (temp, wind, feels-like) |
| `/api/route` | GET | Query params: `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng`. Returns `shortest` and `comfort` routes with geometry, distance, duration, feels-like avg, wind exposure, pedway segment count. |

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- (Optional) API keys: `OPENWEATHERMAP_API_KEY`, `EXPO_PUBLIC_MAPBOX_TOKEN`

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Set `OPENWEATHERMAP_API_KEY` for live weather. Without it, mock data is used.

### Frontend

```bash
cd app
npm install
npm start
```

For web: `npm run web`. For mobile: `npm run android` or `npm run ios`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap API key (live weather) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Mapbox token (optional geocoding) |
| `EXPO_PUBLIC_API_URL` | Backend URL (default: auto-detected in dev) |

---

## Project Structure

```
WindWalk/
├── app/                    # React Native (Expo) frontend
│   ├── components/         # SearchPanel, MapContainer, RouteCards, etc.
│   ├── context/            # RouteContext (origin, destination, routes)
│   ├── utils/              # geocode.js, routeUtils.js
│   └── constants/
├── backend/                # Python FastAPI
│   ├── main.py             # API routes
│   ├── routing.py          # Shortest & comfort path finding
│   ├── wind_cost.py        # Edge weight computation
│   ├── graph_builder.py    # NetworkX graph from wind + pedway data
│   ├── weather.py          # OpenWeatherMap fetch
│   └── transit_stations.py  # CTA/Metra station coords
├── data/
│   ├── wind_amplification.json   # Street segments + amplification
│   ├── pedway_network.json       # Pedway segments
│   └── raw/                      # OSM streets, buildings
└── scripts/                # Data pipeline
    ├── p1_download_data.py
    ├── p1_build_wind_model.py
    └── p3_build_pedway.py
```

---

## Key Design Decisions

1. **Pedway as first-class edges** — Pedway segments are treated as 0.3× distance cost; the Comfort route naturally prefers them when they reduce wind exposure.
2. **16-point compass** — Wind direction is discretized to 16 directions for lookup in amplification tables.
3. **Fallback on routing failure** — If no path is found or an error occurs, we return a direct line segment so the user always sees something.
4. **Curated place suggestions** — Landmarks, transit stations, and DePaul buildings are in `SUGGESTED_PLACES` and prioritized over Mapbox results when typing.

---

## License

Private. Built for hackathon.
