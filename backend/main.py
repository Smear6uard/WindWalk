import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WindWalk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/weather")
def weather():
    return {
        "city": "Chicago",
        "temp_f": 28,
        "feels_like_f": 18,
        "wind_speed_mph": 22,
        "wind_direction_deg": 270,
        "wind_gust_mph": 35,
        "condition": "Partly Cloudy",
        "icon": "02d",
        "humidity": 45,
        "timestamp": "2025-01-15T14:00:00Z",
    }


@app.get("/api/route")
def route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
):
    return {
        "origin": {"lat": origin_lat, "lng": origin_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng},
        "routes": [
            {
                "id": "shortest",
                "label": "Shortest",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [origin_lng, origin_lat],
                        [-87.6298, 41.8827],
                        [-87.6310, 41.8835],
                        [dest_lng, dest_lat],
                    ],
                },
                "distance_m": 950,
                "duration_min": 12,
                "feels_like_avg_f": 14,
                "wind_exposure": "high",
                "pedway_segments": 0,
                "segments": [
                    {"type": "outdoor", "distance_m": 950, "wind_amplification": 1.8},
                ],
            },
            {
                "id": "comfort",
                "label": "Comfort",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [origin_lng, origin_lat],
                        [-87.6295, 41.8822],
                        [-87.6305, 41.8830],
                        [-87.6312, 41.8838],
                        [dest_lng, dest_lat],
                    ],
                },
                "distance_m": 1200,
                "duration_min": 15,
                "feels_like_avg_f": 24,
                "wind_exposure": "low",
                "pedway_segments": 2,
                "segments": [
                    {"type": "outdoor", "distance_m": 400, "wind_amplification": 0.6},
                    {"type": "pedway", "distance_m": 350, "wind_amplification": 0.0},
                    {"type": "outdoor", "distance_m": 100, "wind_amplification": 0.4},
                    {"type": "pedway", "distance_m": 200, "wind_amplification": 0.0},
                    {"type": "outdoor", "distance_m": 150, "wind_amplification": 0.8},
                ],
            },
        ],
    }
