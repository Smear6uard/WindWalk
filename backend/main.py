import logging
import os

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from graph_builder import build_graph
from routing import find_routes
from weather import get_weather_or_mock, invalidate_cache
from transit_stations import is_near_transit_station

logger = logging.getLogger("windwalk")

app = FastAPI(title="WindWalk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build graphs at startup: default (no CTA transfer tunnels) and with CTA transfers
GRAPH = build_graph(include_cta_transfers=False)
GRAPH_WITH_CTA = build_graph(include_cta_transfers=True)


def _route_to_api_format(route_dict: dict, route_id: str, label: str) -> dict:
    """Convert routing engine output to API response format."""
    segments = []
    for s in route_dict.get("segments", []):
        seg = {
            "type": "pedway" if s.get("is_pedway") else "outdoor",
            "distance_m": round(s.get("distance", 0)) if "distance" in s else 0,
            "wind_amplification": s.get("wind_amplification", 0),
            "feels_like_f": s.get("feels_like_f"),
            "is_pedway": s.get("is_pedway", False),
        }
        segments.append(seg)
    return {
        "id": route_id,
        "label": label,
        "geometry": route_dict.get("geometry", {"type": "LineString", "coordinates": []}),
        "distance_m": route_dict.get("distance_m", 0),
        "duration_min": route_dict.get("duration_min", 0),
        "feels_like_avg_f": route_dict.get("feels_like_avg_f"),
        "wind_exposure": route_dict.get("wind_exposure", "unknown"),
        "pedway_segments": route_dict.get("pedway_segments", 0),
        "segments": segments,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/weather")
def weather(force_refresh: bool = Query(False)):
    if force_refresh:
        invalidate_cache()
    return get_weather_or_mock(refresh=force_refresh)


# Amplification threshold: streets with amp >= this are "windy" for current wind
# Data max ~1.22 for aligned streets; use 1.12 to show streets with noticeable channeling
WINDY_STREET_THRESHOLD = 1.12


@app.get("/api/wind-streets")
def wind_streets(wind_direction: str = Query(..., description="16-point compass, e.g. NNW")):
    """Return GeoJSON of street segments with high wind amplification for the given direction.
    Used to show 'wind tunnel' streets on the map so users see we avoid them."""
    valid = ("N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
             "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW")
    if wind_direction not in valid:
        wind_direction = "N"  # fallback

    features = []
    for u, v, d in GRAPH.edges(data=True):
        if d.get("is_pedway"):
            continue
        amp = d.get("amplification", {}).get(wind_direction, 1.0)
        if amp >= WINDY_STREET_THRESHOLD:
            # GeoJSON: [lng, lat]; graph nodes are (lat, lng)
            coords = [[u[1], u[0]], [v[1], v[0]]]
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {"amplification": round(amp, 2)},
            })

    return {
        "type": "FeatureCollection",
        "features": features,
        "wind_direction": wind_direction,
    }


@app.get("/api/route")
def route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
):
    try:
        wx = get_weather_or_mock()
        # Ensure wind_direction (compass) for routing
        if "wind_direction" not in wx and "wind_direction_deg" in wx:
            from utils import deg_to_compass
            wx["wind_direction"] = deg_to_compass(wx["wind_direction_deg"])
        # Use CTA transfer tunnels (e.g. Jackson Red-Blue) only when both endpoints are transit stations
        graph = GRAPH_WITH_CTA if (
            is_near_transit_station(origin_lat, origin_lng)
            and is_near_transit_station(dest_lat, dest_lng)
        ) else GRAPH
        result = find_routes(origin_lat, origin_lng, dest_lat, dest_lng, wx, graph)
    except Exception as e:
        logger.exception("Routing failed")
        raise

    if "error" in result:
        # Fallback: return a direct-line route so the user always sees something
        from utils import haversine
        dist_m = haversine(origin_lat, origin_lng, dest_lat, dest_lng)
        duration_min = round(dist_m / 80, 1)  # ~80 m/min walking
        fallback_route = {
            "id": "direct",
            "label": "Direct",
            "geometry": {
                "type": "LineString",
                "coordinates": [[origin_lng, origin_lat], [dest_lng, dest_lat]],
            },
            "distance_m": round(dist_m),
            "duration_min": duration_min,
            "feels_like_avg_f": wx.get("feels_like_f", wx.get("temp_f", 28)),
            "wind_exposure": "unknown",
            "pedway_segments": 0,
            "segments": [
                {"type": "outdoor", "distance_m": round(dist_m), "wind_amplification": 1.0},
            ],
        }
        return {
            "origin": {"lat": origin_lat, "lng": origin_lng},
            "destination": {"lat": dest_lat, "lng": dest_lng},
            "routes": [fallback_route],
            "weather": wx,
            "fallback": True,
        }

    routes = [
        _route_to_api_format(result["shortest"], "shortest", "Shortest"),
        _route_to_api_format(result["comfort"], "comfort", "Comfort"),
    ]
    return {
        "origin": {"lat": origin_lat, "lng": origin_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng},
        "routes": routes,
        "weather": result.get("weather", wx),
    }
