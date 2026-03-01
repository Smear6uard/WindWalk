"""
Weather module for the Chicago pedestrian routing app.

Fetches current weather for the Chicago Loop (OpenWeatherMap One Call API 3.0),
computes wind chill and effective feels-like for street-level routing.

Import in the routing engine:
    from weather import get_weather, effective_feels_like
"""

import os
import time
import json

import requests

# --- Constants ---
CHICAGO_LOOP_LAT = 41.8819
CHICAGO_LOOP_LON = -87.6278
ONE_CALL_URL = "https://api.openweathermap.org/data/3.0/onecall"
CACHE_TTL_SECONDS = 300  # 5 minutes

_COMPASS_16 = (
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
)

_cache_time = None
_cache_result = None

MOCK_WEATHER = {
    "temp_f": 28,
    "wind_speed_mph": 18,
    "wind_direction": "NNW",
    "wind_direction_deg": 337,
    "feels_like_f": 14,
    "humidity": 65,
    "description": "clear sky",
    "computed_wind_chill_f": 10,
}


def deg_to_compass(deg: float) -> str:
    """Convert 0-360 degrees to a 16-point compass string (e.g. 0=N, 90=E, 337=NNW)."""
    deg = deg % 360
    index = round(deg / 22.5) % 16
    return _COMPASS_16[index]


def wind_chill_f(temp_f: float, wind_mph: float) -> int:
    """
    NWS wind chill formula.
    Returns temp_f unchanged if temp_f > 50 or wind_mph <= 3; otherwise rounded integer.
    """
    if temp_f > 50 or wind_mph <= 3:
        return int(round(temp_f))
    v = wind_mph ** 0.16
    wc = 35.74 + 0.6215 * temp_f - 35.75 * v + 0.4275 * temp_f * v
    return int(round(wc))


def effective_feels_like(temp_f: float, wind_mph: float, amplification: float) -> int:
    """
    Feels-like temperature with amplified wind (e.g. for street canyons).
    Multiplies wind_mph by amplification, then applies wind chill.
    """
    amplified = wind_mph * amplification
    return wind_chill_f(temp_f, amplified)


def invalidate_cache() -> None:
    """Force the next get_weather() call to fetch fresh data from the API."""
    global _cache_time, _cache_result
    _cache_time = None
    _cache_result = None


def get_weather() -> dict:
    """
    Fetch current weather for Chicago Loop center.
    Caches result for 5 minutes. Requires OPENWEATHERMAP_API_KEY in environment.
    """
    api_key = os.environ.get("OPENWEATHERMAP_API_KEY")
    if not api_key or not api_key.strip():
        raise EnvironmentError(
            "OPENWEATHERMAP_API_KEY is not set. Set it in your environment or .env to use live weather."
        )

    global _cache_time, _cache_result
    now = time.time()
    if _cache_result is not None and _cache_time is not None and (now - _cache_time) < CACHE_TTL_SECONDS:
        return _cache_result

    params = {
        "lat": CHICAGO_LOOP_LAT,
        "lon": CHICAGO_LOOP_LON,
        "appid": api_key,
        "units": "imperial",
        "exclude": "minutely,hourly,daily,alerts",
    }
    resp = requests.get(ONE_CALL_URL, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    current = data.get("current")
    if not current:
        # One Call 3.0 may return "data" array for some plans
        data_list = data.get("data", [])
        current = data_list[0] if data_list else None
    if not current:
        raise ValueError("OpenWeatherMap response missing current weather")

    temp_f = int(round(current["temp"]))
    feels_like_f = int(round(current["feels_like"]))
    wind_speed_mph = current["wind_speed"]
    wind_deg = int(round(current.get("wind_deg", 0)))
    wind_direction = deg_to_compass(wind_deg)
    humidity = int(current.get("humidity", 0))
    description = (current.get("weather") or [{}])[0].get("description", "")
    if isinstance(description, dict):
        description = description.get("description", "")
    computed_wind_chill_f = wind_chill_f(temp_f, wind_speed_mph)

    _cache_result = {
        "temp_f": temp_f,
        "wind_speed_mph": int(round(wind_speed_mph)),
        "wind_direction": wind_direction,
        "wind_direction_deg": wind_deg,
        "feels_like_f": feels_like_f,
        "humidity": humidity,
        "description": description or "clear sky",
        "computed_wind_chill_f": computed_wind_chill_f,
    }
    _cache_time = now
    return _cache_result


def get_weather_or_mock() -> dict:
    """
    Return live weather if OPENWEATHERMAP_API_KEY is set, otherwise a hardcoded mock (for development).
    Prints a warning to stdout when using mock data.
    """
    if os.environ.get("OPENWEATHERMAP_API_KEY", "").strip():
        return get_weather()
    print("Warning: OPENWEATHERMAP_API_KEY not set; using mock weather data.", flush=True)
    return MOCK_WEATHER.copy()


if __name__ == "__main__":
    # Test deg_to_compass
    assert deg_to_compass(0) == "N"
    assert deg_to_compass(90) == "E"
    assert deg_to_compass(180) == "S"
    assert deg_to_compass(270) == "W"
    assert deg_to_compass(337) == "NNW"
    assert deg_to_compass(45) == "NE"
    print("deg_to_compass: N, E, S, W, NNW, NE OK")

    # Test wind_chill_f
    wc1 = wind_chill_f(28, 18)
    wc2 = wind_chill_f(10, 25)
    wc3 = wind_chill_f(60, 20)
    print(f"wind_chill_f(28, 18) = {wc1}")
    print(f"wind_chill_f(10, 25) = {wc2}")
    print(f"wind_chill_f(60, 20) = {wc3} (unchanged, temp > 50)")

    # Test effective_feels_like
    eff_18 = effective_feels_like(28, 18, 1.8)
    eff_10 = effective_feels_like(28, 18, 1.0)
    print(f"effective_feels_like(28, 18, amp=1.8) = {eff_18}")
    print(f"effective_feels_like(28, 18, amp=1.0) = {eff_10}")

    # get_weather_or_mock and print as JSON
    weather = get_weather_or_mock()
    print(json.dumps(weather, indent=2))
