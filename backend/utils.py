import math


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in meters between two GPS coordinates."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def deg_to_compass(degrees: float) -> str:
    """Convert wind direction in degrees (0-360) to a 16-point compass string."""
    directions = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ]
    idx = round(degrees / 22.5) % 16
    return directions[idx]


def wind_chill_f(temp_f: float, wind_mph: float) -> float:
    """NWS wind chill formula. Returns temp unchanged if temp > 50°F or wind <= 3 mph."""
    if temp_f > 50 or wind_mph <= 3:
        return temp_f
    v_exp = wind_mph ** 0.16
    return 35.74 + 0.6215 * temp_f - 35.75 * v_exp + 0.4275 * temp_f * v_exp


def classify_exposure(feels_like_f: float) -> str:
    """Classify exposure risk based on feels-like temperature in °F."""
    if feels_like_f >= 20:
        return "low"
    if feels_like_f >= 10:
        return "moderate"
    return "high"


if __name__ == "__main__":
    # --- haversine ---
    # NYC to LA ≈ 3,944 km
    d = haversine(40.7128, -74.0060, 34.0522, -118.2437)
    assert 3_930_000 < d < 3_950_000, f"NYC-LA distance {d}"

    # Same point => 0
    assert haversine(0, 0, 0, 0) == 0

    # --- deg_to_compass ---
    assert deg_to_compass(0) == "N"
    assert deg_to_compass(360) == "N"
    assert deg_to_compass(90) == "E"
    assert deg_to_compass(180) == "S"
    assert deg_to_compass(270) == "W"
    assert deg_to_compass(45) == "NE"
    assert deg_to_compass(225) == "SW"
    assert deg_to_compass(22.5) == "NNE"
    assert deg_to_compass(337.5) == "NNW"

    # --- wind_chill_f ---
    # No chill: warm temp
    assert wind_chill_f(55, 10) == 55
    # No chill: low wind
    assert wind_chill_f(30, 2) == 30
    # Known NWS value: 0°F at 15 mph ≈ -19°F
    wc = wind_chill_f(0, 15)
    assert -20 < wc < -18, f"wind chill at 0F/15mph = {wc}"
    # 30°F at 10 mph ≈ 21°F
    wc2 = wind_chill_f(30, 10)
    assert 20 < wc2 < 23, f"wind chill at 30F/10mph = {wc2}"

    # --- classify_exposure ---
    assert classify_exposure(25) == "low"
    assert classify_exposure(20) == "low"
    assert classify_exposure(15) == "moderate"
    assert classify_exposure(10) == "moderate"
    assert classify_exposure(5) == "high"
    assert classify_exposure(-10) == "high"

    print("All tests passed.")
