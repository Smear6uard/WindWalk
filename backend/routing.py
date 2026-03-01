"""Route finding: shortest (by distance) and comfort (by wind-weighted cost)."""

import networkx as nx

from graph_builder import build_graph, snap_to_graph
from utils import classify_exposure, haversine
from wind_cost import compute_edge_weight, compute_feels_like_for_edge

WALK_SPEED_M_PER_MIN = 80  # ~4.8 km/h
SNAP_THRESHOLD_M = 15  # If snapped node is > this far from requested point, add connector leg


def _edge_key(a: tuple, b: tuple) -> tuple:
    """Order-independent key for an undirected edge."""
    return tuple(sorted((a, b)))


def _compute_comfort_path(graph, origin, dest, wind_speed, wind_dir, temp_f, shortest_path):
    """Compute comfort path and try to avoid identical result to shortest path."""
    comfort_path = nx.shortest_path(
        graph,
        origin,
        dest,
        weight=lambda u, v, d: compute_edge_weight(d, wind_speed, wind_dir, temp_f),
    )

    if comfort_path != shortest_path:
        return comfort_path

    shortest_edges = {
        _edge_key(shortest_path[i], shortest_path[i + 1])
        for i in range(len(shortest_path) - 1)
    }

    def diversified_weight(u, v, d):
        base = compute_edge_weight(d, wind_speed, wind_dir, temp_f)
        if _edge_key(u, v) in shortest_edges:
            return base * 1.4
        return base

    alt_path = nx.shortest_path(
        graph,
        origin,
        dest,
        weight=diversified_weight,
    )
    if alt_path != shortest_path:
        return alt_path

    try:
        simple_paths = nx.shortest_simple_paths(
            graph,
            origin,
            dest,
            weight=diversified_weight,
        )
        for path in simple_paths:
            if path != shortest_path:
                return path
    except Exception:
        pass

    return comfort_path


def _build_path_result(
    graph: nx.Graph,
    path: list[tuple],
    weather: dict,
    raw_origin: tuple | None = None,
    raw_dest: tuple | None = None,
) -> dict:
    """Convert a list of graph nodes into a route response dict.

    When raw_origin/raw_dest are provided and differ from the path endpoints by more
    than SNAP_THRESHOLD_M, prepends/appends the actual coordinates so the route
    starts and ends at the user's chosen location (e.g. Merchandise Mart).
    """
    coordinates = [[node[1], node[0]] for node in path]  # [lng, lat]

    total_distance = 0.0
    feels_like_sum = 0.0
    pedway_count = 0
    segments = []

    wind_speed = weather["wind_speed_mph"]
    wind_dir = weather["wind_direction"]
    temp_f = weather["temp_f"]

    # Prepend origin connector if user's point is outside/near graph boundary
    if raw_origin and len(path) >= 1:
        o_lat, o_lng = raw_origin
        first_node = path[0]
        dist_to_first = haversine(o_lat, o_lng, first_node[0], first_node[1])
        if dist_to_first > SNAP_THRESHOLD_M:
            coordinates.insert(0, [o_lng, o_lat])
            total_distance += dist_to_first
            fl = temp_f  # Connector is outdoor (no pedway)
            feels_like_sum += fl
            segments.append({
                "segment_id": "origin_connector",
                "distance": dist_to_first,
                "wind_amplification": 1.0,
                "feels_like_f": round(fl, 1),
                "is_pedway": False,
            })

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
            "distance": dist,
            "wind_amplification": round(
                edge_data["amplification"].get(wind_dir, 1.0) if not is_pedway else 0.0,
                2,
            ),
            "feels_like_f": round(fl, 1),
            "is_pedway": is_pedway,
        })

    # Append destination connector if user's point is outside/near graph boundary
    if raw_dest and len(path) >= 1:
        d_lat, d_lng = raw_dest
        last_node = path[-1]
        dist_to_last = haversine(last_node[0], last_node[1], d_lat, d_lng)
        if dist_to_last > SNAP_THRESHOLD_M:
            coordinates.append([d_lng, d_lat])
            total_distance += dist_to_last
            fl = temp_f
            feels_like_sum += fl
            segments.append({
                "segment_id": "dest_connector",
                "distance": dist_to_last,
                "wind_amplification": 1.0,
                "feels_like_f": round(fl, 1),
                "is_pedway": False,
            })

    num_edges = max(len(segments), 1)
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
        comfort_path = _compute_comfort_path(
            graph,
            origin,
            dest,
            wind_speed,
            wind_dir,
            temp_f,
            shortest_path,
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return {"error": "No walking path exists between origin and destination."}

    raw_origin = (origin_lat, origin_lng)
    raw_dest = (dest_lat, dest_lng)

    return {
        "shortest": _build_path_result(
            graph, shortest_path, weather,
            raw_origin=raw_origin, raw_dest=raw_dest,
        ),
        "comfort": _build_path_result(
            graph, comfort_path, weather,
            raw_origin=raw_origin, raw_dest=raw_dest,
        ),
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
