import logging
import os

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from graph_builder import build_graph
from routing import find_routes
from weather import get_weather_or_mock

logger = logging.getLogger("windwalk")

app = FastAPI(title="WindWalk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build graph once at startup (covers Chicago Loop + pedway)
GRAPH = build_graph()


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
def weather():
    return get_weather_or_mock()


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
        result = find_routes(origin_lat, origin_lng, dest_lat, dest_lng, wx, GRAPH)
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
