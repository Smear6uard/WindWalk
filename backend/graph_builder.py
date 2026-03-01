"""Build a NetworkX walking graph from wind amplification data."""

import json
import math
import os
import random

import networkx as nx

from utils import haversine

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "wind_amplification.json")
PEDWAY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pedway_network.json")

# 16-point compass directions
DIRECTIONS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]


def generate_dummy_wind_data() -> dict:
    """Generate a simple grid of fake street segments covering the Chicago Loop.

    Covers latitude 41.875–41.887, longitude -87.6395–-87.6245 with a grid
    roughly every 0.001 degrees. Amplification values are random in [1.0, 2.0].
    Saves the result to DATA_PATH so the rest of the system works.
    """
    random.seed(42)

    lat_min, lat_max = 41.875, 41.887
    lng_min, lng_max = -87.6395, -87.6245
    step = 0.001

    lats = []
    lat = lat_min
    while lat <= lat_max:
        lats.append(round(lat, 6))
        lat += step
    lngs = []
    lng = lng_min
    while lng <= lng_max:
        lngs.append(round(lng, 6))
        lng += step

    segments = []
    seg_idx = 0

    # Horizontal segments (east-west streets)
    for lat_val in lats:
        for i in range(len(lngs) - 1):
            seg_idx += 1
            amp = {d: round(random.uniform(1.0, 2.0), 2) for d in DIRECTIONS}
            segments.append({
                "segment_id": f"seg_{seg_idx:04d}",
                "start": [lat_val, lngs[i]],
                "end": [lat_val, lngs[i + 1]],
                "street_name": f"E-W Street @ {lat_val:.3f}",
                "amplification_by_direction": amp,
            })

    # Vertical segments (north-south streets)
    for lng_val in lngs:
        for i in range(len(lats) - 1):
            seg_idx += 1
            amp = {d: round(random.uniform(1.0, 2.0), 2) for d in DIRECTIONS}
            segments.append({
                "segment_id": f"seg_{seg_idx:04d}",
                "start": [lats[i], lng_val],
                "end": [lats[i + 1], lng_val],
                "street_name": f"N-S Street @ {lng_val:.4f}",
                "amplification_by_direction": amp,
            })

    data = {"segments": segments}
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)
    return data


def load_wind_data() -> dict:
    """Load wind amplification JSON, generating dummy data if the file is missing."""
    if not os.path.exists(DATA_PATH):
        print(f"[graph_builder] {DATA_PATH} not found — generating dummy data")
        return generate_dummy_wind_data()
    with open(DATA_PATH) as f:
        return json.load(f)


def _load_pedway_data() -> dict | None:
    """Load pedway network JSON if it exists, otherwise return None."""
    if not os.path.exists(PEDWAY_PATH):
        print(f"[graph_builder] {PEDWAY_PATH} not found — skipping pedway data")
        return None
    with open(PEDWAY_PATH) as f:
        data = json.load(f)
    print(f"[graph_builder] Loaded {len(data.get('segments', []))} pedway segments")
    return data


def _find_nearest_street_node(
    node: tuple, street_nodes: list[tuple], max_dist: float = 100.0
) -> tuple | None:
    """Find the nearest street-network node within max_dist meters."""
    best_node = None
    best_dist = math.inf
    for sn in street_nodes:
        d = haversine(node[0], node[1], sn[0], sn[1])
        if d < best_dist:
            best_dist = d
            best_node = sn
    if best_dist <= max_dist:
        return best_node
    return None


# Amplification dicts for pedway vs connector edges
_ZERO_AMP = {d: 0.0 for d in DIRECTIONS}
_UNIT_AMP = {d: 1.0 for d in DIRECTIONS}


def build_graph(data: dict | None = None) -> nx.Graph:
    """Build a NetworkX graph from wind amplification segment data.

    Nodes are (lat, lng) tuples.
    Edge attributes: segment_id, distance, street_name, amplification, is_pedway.
    Pedway segments are loaded from PEDWAY_PATH and stitched to the street network.
    """
    if data is None:
        data = load_wind_data()

    G = nx.Graph()

    for seg in data["segments"]:
        start = tuple(seg["start"])  # (lat, lng)
        end = tuple(seg["end"])

        G.add_node(start)
        G.add_node(end)

        dist = haversine(start[0], start[1], end[0], end[1])

        G.add_edge(
            start,
            end,
            segment_id=seg["segment_id"],
            distance=dist,
            street_name=seg.get("street_name", ""),
            amplification=seg.get("amplification_by_direction", {}),
            is_pedway=False,
        )

    # --- Pedway integration ---
    pedway_data = _load_pedway_data()
    if pedway_data:
        # Snapshot street nodes before adding pedway nodes
        street_nodes = list(G.nodes)

        pedway_nodes = set()
        for seg in pedway_data["segments"]:
            entry = tuple(seg["surface_entry"])
            exit_ = tuple(seg["surface_exit"])
            dist_m = seg["distance_m"]

            G.add_node(entry)
            G.add_node(exit_)
            pedway_nodes.add(entry)
            pedway_nodes.add(exit_)

            G.add_edge(
                entry,
                exit_,
                segment_id=seg["segment_id"],
                distance=dist_m,
                street_name=seg.get("name", ""),
                amplification=_ZERO_AMP,
                is_pedway=True,
            )

        # Stitch each pedway node to the nearest street node
        connected = 0
        for pn in pedway_nodes:
            nearest = _find_nearest_street_node(pn, street_nodes)
            if nearest is not None:
                d = haversine(pn[0], pn[1], nearest[0], nearest[1])
                G.add_edge(
                    pn,
                    nearest,
                    segment_id=f"pedway_conn_{pn[0]}_{pn[1]}",
                    distance=d,
                    street_name="pedway connector",
                    amplification=_UNIT_AMP,
                    is_pedway=False,
                )
                connected += 1
        print(f"[graph_builder] Stitched {connected}/{len(pedway_nodes)} pedway nodes to street network")

    return G


def snap_to_graph(lat: float, lng: float, graph: nx.Graph) -> tuple:
    """Find the nearest graph node to the given coordinates.

    Uses brute-force search over all nodes — fine for the Loop area (~300 nodes).
    """
    best_node = None
    best_dist = math.inf

    for node in graph.nodes:
        d = haversine(lat, lng, node[0], node[1])
        if d < best_dist:
            best_dist = d
            best_node = node

    return best_node


if __name__ == "__main__":
    G = build_graph()
    print(f"Nodes: {G.number_of_nodes()}")
    print(f"Edges: {G.number_of_edges()}")

    # Verify snap_to_graph for a known Loop coordinate (Willis Tower area)
    test_lat, test_lng = 41.8789, -87.6359
    nearest = snap_to_graph(test_lat, test_lng, G)
    dist = haversine(test_lat, test_lng, nearest[0], nearest[1])
    print(f"snap_to_graph({test_lat}, {test_lng}) -> {nearest}  (dist={dist:.1f}m)")
    assert dist < 200, f"Nearest node too far: {dist:.1f}m"

    # Verify edge attributes
    sample_edge = list(G.edges(data=True))[0]
    attrs = sample_edge[2]
    assert "segment_id" in attrs
    assert "distance" in attrs
    assert "amplification" in attrs
    assert "is_pedway" in attrs
    assert isinstance(attrs["amplification"], dict)
    print(f"Sample edge: {sample_edge[0]} -> {sample_edge[1]}")
    print(f"  segment_id={attrs['segment_id']}, distance={attrs['distance']:.1f}m, "
          f"street={attrs['street_name']}, is_pedway={attrs['is_pedway']}")
    print(f"  amplification keys: {list(attrs['amplification'].keys())[:4]}...")

    # --- Pedway verification ---
    pedway_edges = [(u, v, d) for u, v, d in G.edges(data=True) if d.get("is_pedway")]
    connector_edges = [(u, v, d) for u, v, d in G.edges(data=True)
                       if d.get("street_name") == "pedway connector"]
    print(f"\nPedway edges: {len(pedway_edges)}")
    print(f"Pedway connector edges: {len(connector_edges)}")

    if pedway_edges:
        assert len(pedway_edges) >= 1, "Expected at least one pedway edge"
        pw = pedway_edges[0][2]
        assert pw["is_pedway"] is True
        assert all(pw["amplification"][d] == 0.0 for d in DIRECTIONS), \
            "Pedway amplification should be 0.0 for all directions"
        print(f"  Sample pedway: {pedway_edges[0][0]} -> {pedway_edges[0][1]}")
        print(f"    segment_id={pw['segment_id']}, distance={pw['distance']}m, "
              f"street={pw['street_name']}")

    if connector_edges:
        conn = connector_edges[0][2]
        assert conn["is_pedway"] is False
        assert all(conn["amplification"][d] == 1.0 for d in DIRECTIONS), \
            "Connector amplification should be 1.0 for all directions"
        print(f"  Sample connector: {connector_edges[0][0]} -> {connector_edges[0][1]}")
        print(f"    distance={conn['distance']:.1f}m")

    print("\nAll tests passed.")
