import logging

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from weather import get_weather_or_mock
from graph_builder import build_graph
from routing import find_routes

logger = logging.getLogger("windwalk")

app = FastAPI(title="WindWalk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HARDCODED_WEATHER = {
    "temp_f": 28,
    "wind_speed_mph": 18,
    "wind_direction": "NNW",
    "wind_direction_deg": 337,
    "feels_like_f": 14,
    "humidity": 65,
    "description": "Clear",
}

HARDCODED_ROUTE = {
    "shortest": {
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-87.6298, 41.8819],
                [-87.6295, 41.8825],
                [-87.6290, 41.8831],
                [-87.6285, 41.8837],
                [-87.6280, 41.8843],
            ],
        },
        "distance_m": 820,
        "duration_min": 10,
        "feels_like_avg_f": 8,
        "wind_exposure": "high",
        "pedway_segments": 0,
        "segments": [
            {"segment_id": "sh-1", "wind_amplification": 1.9, "feels_like_f": 5, "is_pedway": False},
            {"segment_id": "sh-2", "wind_amplification": 2.1, "feels_like_f": 3, "is_pedway": False},
            {"segment_id": "sh-3", "wind_amplification": 1.7, "feels_like_f": 8, "is_pedway": False},
            {"segment_id": "sh-4", "wind_amplification": 2.3, "feels_like_f": 2, "is_pedway": False},
        ],
    },
    "comfort": {
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-87.6298, 41.8819],
                [-87.6300, 41.8823],
                [-87.6303, 41.8827],
                [-87.6306, 41.8831],
                [-87.6309, 41.8835],
                [-87.6305, 41.8839],
                [-87.6280, 41.8843],
            ],
        },
        "distance_m": 1150,
        "duration_min": 14,
        "feels_like_avg_f": 22,
        "wind_exposure": "low",
        "pedway_segments": 2,
        "segments": [
            {"segment_id": "co-1", "wind_amplification": 0.5, "feels_like_f": 18, "is_pedway": False},
            {"segment_id": "co-2", "wind_amplification": 0.0, "feels_like_f": 28, "is_pedway": True},
            {"segment_id": "co-3", "wind_amplification": 0.4, "feels_like_f": 20, "is_pedway": False},
            {"segment_id": "co-4", "wind_amplification": 0.0, "feels_like_f": 28, "is_pedway": True},
            {"segment_id": "co-5", "wind_amplification": 0.6, "feels_like_f": 16, "is_pedway": False},
        ],
    },
    "weather": HARDCODED_WEATHER,
}

# ---------------------------------------------------------------------------
# Build graph on startup
# ---------------------------------------------------------------------------
GRAPH = None
try:
    GRAPH = build_graph()
    logger.info("Graph built: %d nodes, %d edges", GRAPH.number_of_nodes(), GRAPH.number_of_edges())
except Exception:
    logger.exception("Failed to build graph — route endpoint will return dummy data")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/weather")
def weather():
    try:
        return get_weather_or_mock()
    except Exception:
        logger.exception("Weather fetch failed — returning hardcoded data")
        return HARDCODED_WEATHER


@app.get("/api/route")
def route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
):
    if GRAPH is None:
        logger.error("Graph not available — returning dummy route data")
        return HARDCODED_ROUTE

    try:
        try:
            wx = get_weather_or_mock()
        except Exception:
            logger.exception("Weather fetch failed in /api/route — using hardcoded weather")
            wx = HARDCODED_WEATHER

        return find_routes(origin_lat, origin_lng, dest_lat, dest_lng, wx, GRAPH)
    except Exception:
        logger.exception("Routing failed — returning dummy route data")
        return HARDCODED_ROUTE
