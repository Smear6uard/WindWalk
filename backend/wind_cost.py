from utils import wind_chill_f


def compute_edge_weight(
    edge_data: dict,
    wind_speed_mph: float,
    wind_direction: str,
    temp_f: float,
) -> float:
    """Return a weighted cost for traversing an edge.

    Pedway edges get a flat 0.3× distance discount (indoor, ~65 °F).
    Surface edges are scaled by a discomfort multiplier derived from the
    wind-chill feels-like temperature along that edge.
    """
    distance = edge_data["distance"]

    if edge_data.get("is_pedway"):
        return distance * 0.3

    amplification = edge_data["amplification"].get(wind_direction, 1.0)
    effective_wind = wind_speed_mph * amplification
    feels_like = wind_chill_f(temp_f, effective_wind)

    if feels_like >= 32:
        multiplier = 1.0
    else:
        multiplier = 1.0 + (32 - feels_like) / 20
        multiplier = min(multiplier, 3.0)

    return distance * multiplier


def compute_feels_like_for_edge(
    edge_data: dict,
    wind_speed_mph: float,
    wind_direction: str,
    temp_f: float,
) -> float:
    """Return the feels-like temperature (°F) for an edge.

    Pedway edges always return 65 °F (climate-controlled indoors).
    """
    if edge_data.get("is_pedway"):
        return 65.0

    amplification = edge_data["amplification"].get(wind_direction, 1.0)
    effective_wind = wind_speed_mph * amplification
    return wind_chill_f(temp_f, effective_wind)


if __name__ == "__main__":
    # ---- Test 1: pedway vs high-amplification surface edge ----
    pedway_edge = {"distance": 200, "is_pedway": True, "amplification": {}}
    surface_edge = {
        "distance": 200,
        "is_pedway": False,
        "amplification": {"N": 1.8},
    }

    pedway_cost = compute_edge_weight(pedway_edge, 25, "N", 10)
    surface_cost = compute_edge_weight(surface_edge, 25, "N", 10)

    assert pedway_cost < surface_cost, (
        f"Pedway cost ({pedway_cost}) should be much less than "
        f"surface cost ({surface_cost})"
    )
    # Pedway should be dramatically cheaper
    assert pedway_cost < surface_cost * 0.5, (
        f"Pedway cost ({pedway_cost}) should be less than half "
        f"surface cost ({surface_cost})"
    )

    # ---- Test 2: aligned wind vs perpendicular wind ----
    edge_aligned = {
        "distance": 150,
        "is_pedway": False,
        "amplification": {"N": 1.6, "E": 0.3},
    }

    cost_aligned = compute_edge_weight(edge_aligned, 20, "N", 15)
    cost_perp = compute_edge_weight(edge_aligned, 20, "E", 15)

    assert cost_aligned > cost_perp, (
        f"Aligned-wind cost ({cost_aligned}) should exceed "
        f"perpendicular cost ({cost_perp})"
    )

    # ---- Test 3: pedway feels-like is always 65 ----
    assert compute_feels_like_for_edge(pedway_edge, 30, "N", 0) == 65.0

    # ---- Test 4: surface feels-like drops with wind ----
    fl = compute_feels_like_for_edge(surface_edge, 25, "N", 10)
    assert fl < 10, f"Feels-like ({fl}) should be well below ambient 10 °F"

    print("All tests passed.")
