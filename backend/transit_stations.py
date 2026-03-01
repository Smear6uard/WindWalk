"""CTA and Metra station coordinates in the Loop. Used to determine when to include
fare-required CTA transfer tunnels (e.g. Jackson Red-Blue) in routing."""

# (lat, lng) for CTA L and Metra stations — within ~80m = "at a transit station"
TRANSIT_STATION_COORDS = [
    (41.8786, -87.6406),   # Union Station (Metra)
    (41.8848, -87.6278),   # Lake (Red Line) — for Lake/Washington transfer
    (41.8827, -87.6403),   # Ogilvie Transportation Center (Metra)
    (41.8755, -87.6324),   # LaSalle Street Station (Metra)
    (41.8859, -87.6235),   # Millennium Station (Metra Electric)
    (41.8773, -87.6288),   # Van Buren Street (Metra Electric)
    (41.8795, -87.6261),   # Adams/Wabash (CTA)
    (41.8832, -87.6262),   # Washington/Wabash (CTA)
    (41.8857, -87.6278),   # State/Lake (CTA)
    (41.8857, -87.6309),   # Clark/Lake (CTA)
    (41.8827, -87.6339),   # Washington/Wells (CTA)
    (41.8787, -87.6337),   # Quincy/Wells (CTA)
    (41.8769, -87.6282),   # Harold Washington Library (CTA)
    (41.8807, -87.6294),   # Monroe (Blue Line)
    (41.8832, -87.6294),   # Washington (Blue Line)
    (41.8782, -87.6293),   # Jackson (Blue Line)
    (41.8782, -87.6276),   # Jackson (Red Line)
    (41.8807, -87.6277),   # Monroe (Red Line)
    (41.874, -87.6275),    # Harrison (Red Line)
    (41.8769, -87.6317),   # LaSalle/Van Buren (CTA)
    (41.8756, -87.6317),   # LaSalle (Blue Line)
    (41.8857, -87.6418),   # Clinton (Green/Pink)
    (41.8755, -87.641),    # Clinton (Blue Line)
    (41.889, -87.634),     # Merchandise Mart (CTA Brown/Purple)
    (41.8674, -87.6266),   # Roosevelt (Orange/Green)
    (41.8674, -87.6274),   # Roosevelt (Red Line)
]

NEAR_TRANSIT_THRESHOLD_M = 80


def is_near_transit_station(lat: float, lng: float, threshold_m: float = NEAR_TRANSIT_THRESHOLD_M) -> bool:
    """Check if (lat, lng) is within threshold_m of any CTA/Metra station."""
    from utils import haversine
    for slat, slng in TRANSIT_STATION_COORDS:
        if haversine(lat, lng, slat, slng) <= threshold_m:
            return True
    return False
