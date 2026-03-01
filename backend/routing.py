"""Route finding: shortest (by distance) and comfort (by wind-weighted cost)."""

import networkx as nx

from graph_builder import build_graph, snap_to_graph
from utils import classify_exposure
from wind_cost import compute_edge_weight, compute_feels_like_for_edge

WALK_SPEED_M_PER_MIN = 80  # ~4.8 km/h


def _build_path_result(
    graph: nx.Graph,
    path: list[tuple],
    weather: dict,
) -> dict:
    """Convert a list of graph nodes into a route response dict."""
    coordinates = [[node[1], node[0]] for node in path]  # [lng, lat]

    total_distance = 0.0
    feels_like_sum = 0.0
    pedway_count = 0
    segments = []

    wind_speed = weather["wind_speed_mph"]
    wind_dir = weather["wind_direction"]
    temp_f = weather["temp_f"]

    for i in range(len(path) - 1):
        edge_data = graph.edges[path[i], path[i + 1]]
        dist = edge_data["distance"]
        total_distance += dist

        fl = compute_feels_like_for_edge(edge_data, wind_speed, wind_dir, temp_f)
        feels_like_sum += fl

        is_pedway = edge_data.get("is_pedway", False)
        if is_pedway:
            pedway_count += 1

        segments.append({
            "segment_id": edge_data.get("segment_id", f"seg-{i}"),
            "wind_amplification": round(
                edge_data["amplification"].get(wind_dir, 1.0) if not is_pedway else 0.0,
                2,
            ),
            "feels_like_f": round(fl, 1),
            "is_pedway": is_pedway,
        })

    num_edges = max(len(path) - 1, 1)
    feels_like_avg = feels_like_sum / num_edges

    return {
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates,
        },
        "distance_m": round(total_distance),
        "duration_min": round(total_distance / WALK_SPEED_M_PER_MIN, 1),
        "feels_like_avg_f": round(feels_like_avg, 1),
        "wind_exposure": classify_exposure(feels_like_avg),
        "pedway_segments": pedway_count,
        "segments": segments,
    }


def find_routes(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    weather: dict,
    graph: nx.Graph,
) -> dict:
    """Find shortest and comfort routes between two points.

    Returns a dict with "shortest", "comfort", and "weather" keys.
    Returns an "error" key instead if no path can be found.
    """
    origin = snap_to_graph(origin_lat, origin_lng, graph)
    dest = snap_to_graph(dest_lat, dest_lng, graph)

    if origin is None or dest is None:
        return {"error": "Could not snap origin or destination to the walking graph."}

    wind_speed = weather["wind_speed_mph"]
    wind_dir = weather["wind_direction"]
    temp_f = weather["temp_f"]

    try:
        shortest_path = nx.shortest_path(
            graph, origin, dest, weight="distance",
        )
        comfort_path = nx.shortest_path(
            graph,
            origin,
            dest,
            weight=lambda u, v, d: compute_edge_weight(d, wind_speed, wind_dir, temp_f),
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return {"error": "No walking path exists between origin and destination."}

    return {
        "shortest": _build_path_result(graph, shortest_path, weather),
        "comfort": _build_path_result(graph, comfort_path, weather),
        "weather": weather,
    }


if __name__ == "__main__":
    G = build_graph()
    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # Two known Loop coordinates: Willis Tower area -> Millennium Park area
    origin_lat, origin_lng = 41.879, -87.636
    dest_lat, dest_lng = 41.885, -87.625

    dummy_weather = {
        "temp_f": 28,
        "wind_speed_mph": 18,
        "wind_direction": "NNW",
        "wind_direction_deg": 337,
        "feels_like_f": 14,
        "humidity": 65,
        "description": "Clear",
    }

    result = find_routes(origin_lat, origin_lng, dest_lat, dest_lng, dummy_weather, G)

    if "error" in result:
        print(f"ERROR: {result['error']}")
    else:
        for route_type in ("shortest", "comfort"):
            r = result[route_type]
            print(f"\n{'='*50}")
            print(f"{route_type.upper()} ROUTE")
            print(f"  Distance:       {r['distance_m']} m")
            print(f"  Duration:       {r['duration_min']} min")
            print(f"  Feels-like avg: {r['feels_like_avg_f']} F")
            print(f"  Wind exposure:  {r['wind_exposure']}")
            print(f"  Pedway segs:    {r['pedway_segments']}")
            print(f"  Total segments: {len(r['segments'])}")
            print(f"  GeoJSON points: {len(r['geometry']['coordinates'])}")
            if r["segments"]:
                s = r["segments"][0]
                print(f"  First segment:  id={s['segment_id']}, "
                      f"amp={s['wind_amplification']}, "
                      f"feels={s['feels_like_f']}F, "
                      f"pedway={s['is_pedway']}")

        # Assertions
        shortest = result["shortest"]
        comfort = result["comfort"]
        assert shortest["geometry"]["type"] == "LineString"
        assert comfort["geometry"]["type"] == "LineString"
        assert shortest["distance_m"] > 0
        assert comfort["distance_m"] > 0
        assert len(shortest["segments"]) > 0
        assert len(comfort["segments"]) > 0
        # GeoJSON should be [lng, lat] — lng is negative for Chicago
        first_coord = shortest["geometry"]["coordinates"][0]
        assert first_coord[0] < 0, f"Expected negative lng, got {first_coord[0]}"
        assert result["weather"] == dummy_weather

    print("\nAll tests passed.")
