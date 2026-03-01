"""
P1 Wind Amplification Model & Data Pipeline

Computes street-level wind amplification based on urban canyon geometry.
Uses aspect ratio (building height / street width) and segment orientation
to estimate amplification for 16 compass directions.

Physical reasoning:
- Urban canyons channel wind when it aligns with the street axis (Venturi effect).
- Amplification increases with aspect ratio (taller buildings, narrower streets).
- Cross-street winds experience less channeling (cosine alignment).
- Values capped at 2.5 (safety) and minimum 1.0 (no reduction).

Usage:
    python3 scripts/p1_build_wind_model.py

Outputs:
    data/wind_amplification.json
    data/street_segments.geojson
"""

import json
import logging
import os
from pathlib import Path

import geopandas as gpd
import numpy as np
import requests
from shapely.geometry import LineString, box

# =============================================================================
# CONFIGURATION
# =============================================================================

# Loop bounding box (Chicago): North, South, East, West
BBOX_NORTH = 41.8870
BBOX_SOUTH = 41.8750
BBOX_EAST = -87.6245
BBOX_WEST = -87.6395
BBOX = (BBOX_SOUTH, BBOX_WEST, BBOX_NORTH, BBOX_EAST)

# Geometric parameters
STREET_WIDTH_M = 20.0  # Assumed street width for aspect ratio
BUFFER_M = 30.0  # Buffer distance to find nearby buildings (meters)
DEFAULT_HEIGHT_M = 15.0  # Fallback when building height is missing

# Amplification bounds
AMP_MIN = 1.0
AMP_MAX = 2.5

# 16 compass directions (degrees from North, clockwise)
COMPASS_DIRS = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5,
    "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
}

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_OUT = PROJECT_ROOT / "data"
STREETS_PATH = DATA_RAW / "streets_osm.json"
BUILDINGS_PATH = DATA_RAW / "buildings.geojson"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_TIMEOUT = 60

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# =============================================================================
# DATA FETCHING (delegates to download script or fetches if missing)
# =============================================================================


def _fetch_streets() -> dict:
    """Fetch streets from Overpass if not cached."""
    if STREETS_PATH.exists():
        logger.info("Loading cached streets from %s", STREETS_PATH)
        with open(STREETS_PATH) as f:
            return json.load(f)
    logger.info("Fetching streets from Overpass API...")
    south, west, north, east = BBOX
    query = f"""
    [out:json][timeout:{OVERPASS_TIMEOUT}];
    (
      way["highway"~"^(primary|secondary|tertiary|residential|pedestrian|footway|living_street|service)$"]
        ({south},{west},{north},{east});
    );
    out body;
    >;
    out skel qt;
    """
    try:
        r = requests.post(OVERPASS_URL, data={"data": query}, timeout=OVERPASS_TIMEOUT + 10)
        r.raise_for_status()
        data = r.json()
        DATA_RAW.mkdir(parents=True, exist_ok=True)
        with open(STREETS_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to fetch streets: {e}") from None


def _fetch_buildings() -> gpd.GeoDataFrame:
    """Load buildings from cache or raise."""
    if not BUILDINGS_PATH.exists():
        raise FileNotFoundError(
            f"Buildings not found at {BUILDINGS_PATH}. "
            "Run: python3 scripts/p1_download_data.py"
        )
    gdf = gpd.read_file(BUILDINGS_PATH)
    if gdf.crs is None:
        gdf.set_crs("EPSG:4326", inplace=True)
    elif gdf.crs != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")
    return gdf


# =============================================================================
# SPLIT WAYS AT INTERSECTIONS
# =============================================================================


def _get_intersection_nodes(ways: list, nodes: dict) -> set:
    """
    Find nodes where two or more ways meet (intersection nodes).

    Geometric reasoning: In OSM, ways share nodes at intersections.
    A node is an intersection if it appears in more than one way
    (excluding endpoints of single-way chains).
    """
    node_to_ways = {}
    for w in ways:
        for nid in w.get("nodes", []):
            node_to_ways.setdefault(nid, []).append(w["id"])
    # Intersection = node shared by 2+ ways, or has 3+ connections in one way
    intersection_nodes = set()
    for nid, way_ids in node_to_ways.items():
        if len(way_ids) >= 2:
            intersection_nodes.add(nid)
        elif len(way_ids) == 1:
            # Check if internal node (not endpoint) - split at junctions
            way = next(w for w in ways if w["id"] == way_ids[0])
            nds = way.get("nodes", [])
            if len(nds) >= 3 and nid in nds[1:-1]:
                # Internal node - could be a T-junction from another way
                # For simplicity, we split at all multi-way nodes
                pass
    return intersection_nodes


def _split_way_at_nodes(
    way: dict, nodes: dict, intersection_nodes: set
) -> list[tuple[LineString, tuple, tuple]]:
    """
    Split a way into segments at intersection nodes.

    Each segment runs from one intersection (or way start) to the next
    intersection (or way end). Returns list of (LineString, start_coord, end_coord).
    """
    nds = way.get("nodes", [])
    if len(nds) < 2:
        return []
    coords = []
    for nid in nds:
        if nid in nodes:
            lat, lon = nodes[nid]
            coords.append((lon, lat))  # Shapely uses (x, y) = (lon, lat)
        else:
            return []
    if len(coords) < 2:
        return []

    # Split indices: way start, every intersection node, way end
    split_indices = [0]
    for i in range(1, len(nds) - 1):
        if nds[i] in intersection_nodes:
            split_indices.append(i)
    split_indices.append(len(nds) - 1)

    segments = []
    for j in range(len(split_indices) - 1):
        start_idx = split_indices[j]
        end_idx = split_indices[j + 1]
        if start_idx >= end_idx:
            continue
        segment_coords = coords[start_idx : end_idx + 1]
        if len(segment_coords) < 2:
            continue
        line = LineString(segment_coords)
        start_ll = (segment_coords[0][1], segment_coords[0][0])  # (lat, lon)
        end_ll = (segment_coords[-1][1], segment_coords[-1][0])
        segments.append((line, start_ll, end_ll))
    return segments


def _build_segments_from_osm(osm_data: dict) -> list[dict]:
    """
    Build intersection-to-intersection street segments from OSM data.

    Uses intersection nodes (nodes shared by 2+ ways) as split points.
    Clips to Loop bbox and filters short segments.
    """
    nodes = {el["id"]: (el["lat"], el["lon"]) for el in osm_data.get("elements", []) if el["type"] == "node"}
    ways = [el for el in osm_data.get("elements", []) if el["type"] == "way" and "nodes" in el]

    intersection_nodes = _get_intersection_nodes(ways, nodes)
    logger.info("Found %d intersection nodes", len(intersection_nodes))

    loop_box = box(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)

    all_segments = []
    seg_id = 0
    min_length_deg = 1e-5  # ~1m at Chicago latitude

    for way in ways:
        name = way.get("tags", {}).get("name", "Unknown")
        for line, start_ll, end_ll in _split_way_at_nodes(way, nodes, intersection_nodes):
            if line.length < min_length_deg:
                continue
            if not line.intersects(loop_box):
                continue
            clipped = line.intersection(loop_box)
            if clipped.is_empty:
                continue
            if clipped.geom_type == "Point":
                continue
            if clipped.geom_type == "MultiLineString":
                for part in clipped.geoms:
                    if part.length >= min_length_deg:
                        all_segments.append({
                            "id": f"seg_{seg_id}",
                            "geometry": part,
                            "start": (part.coords[0][1], part.coords[0][0]),
                            "end": (part.coords[-1][1], part.coords[-1][0]),
                            "name": name,
                        })
                        seg_id += 1
            else:
                all_segments.append({
                    "id": f"seg_{seg_id}",
                    "geometry": clipped,
                    "start": (clipped.coords[0][1], clipped.coords[0][0]),
                    "end": (clipped.coords[-1][1], clipped.coords[-1][0]),
                    "name": name,
                })
                seg_id += 1

    logger.info("Built %d street segments from OSM ways", len(all_segments))
    return all_segments


# =============================================================================
# ASPECT RATIO
# =============================================================================


def get_aspect_ratio(
    segment_geom: LineString,
    buildings_gdf: gpd.GeoDataFrame,
    buffer_m: float = BUFFER_M,
    street_width_m: float = STREET_WIDTH_M,
    default_height_m: float = DEFAULT_HEIGHT_M,
) -> float:
    """
    Compute aspect ratio (H/W) for a street segment.

    Geometric reasoning:
    - Buffer the segment by 30m to capture the "urban canyon" - buildings
      that define the street walls. The buffer approximates the catchment
      of buildings that affect wind flow in the canyon.
    - Intersecting buildings contribute their heights; we use the mean.
    - aspect_ratio = avg_building_height / street_width
    - High aspect ratio => deeper canyon => stronger channeling.

    Uses spatial index for O(1) candidate lookup; vectorized intersection.
    """
    # Reproject to meters for accurate buffer
    seg_gdf = gpd.GeoDataFrame(
        {"geometry": [segment_geom]},
        crs="EPSG:4326",
    ).to_crs("EPSG:3857")
    buffered = seg_gdf.geometry.iloc[0].buffer(buffer_m)

    # Use spatial index: sindex.intersection(bbox)
    bbox = buffered.bounds
    if buildings_gdf.crs != "EPSG:3857":
        buildings_m = buildings_gdf.to_crs("EPSG:3857")
    else:
        buildings_m = buildings_gdf

    try:
        possible_idx = list(buildings_m.sindex.intersection(bbox))
    except Exception:
        possible_idx = range(len(buildings_m))

    if not possible_idx:
        return default_height_m / street_width_m

    subset = buildings_m.iloc[possible_idx]
    intersecting = subset[subset.intersects(buffered)]

    if len(intersecting) == 0:
        return default_height_m / street_width_m

    # Find height column (case-insensitive)
    height_col = None
    for c in intersecting.columns:
        if "height" in c.lower() or "stories" in c.lower() or "stories" in c:
            if "height" in c.lower():
                height_col = c
                break
            if height_col is None and "stories" in c.lower():
                height_col = c
    if height_col is None:
        for c in intersecting.columns:
            if "height" in c.lower():
                height_col = c
                break

    if height_col:
        heights = intersecting[height_col].dropna()
        # Handle numeric strings (e.g. "15" or "15.5")
        def to_float(v):
            try:
                return float(v)
            except (ValueError, TypeError):
                return None
        heights = heights.apply(to_float).dropna()
        if len(heights) > 0:
            # Stories: assume ~3m per story if column suggests stories
            if "stories" in height_col.lower() and heights.max() < 50:
                avg_height = heights.mean() * 3.0
            else:
                avg_height = heights.mean()
        else:
            avg_height = default_height_m
    else:
        avg_height = default_height_m

    return avg_height / street_width_m


# =============================================================================
# WIND AMPLIFICATION
# =============================================================================


def segment_bearing(start: tuple[float, float], end: tuple[float, float]) -> float:
    """
    Compute bearing (orientation) of segment from start to end.

    Returns degrees from North (0-360), clockwise.
    Uses spherical geometry for accuracy at mid-latitudes.
    """
    lat1, lon1 = np.radians(start[0]), np.radians(start[1])
    lat2, lon2 = np.radians(end[0]), np.radians(end[1])
    dlon = lon2 - lon1
    x = np.sin(dlon) * np.cos(lat2)
    y = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
    bearing = np.degrees(np.arctan2(x, y)) % 360
    return float(bearing)


def compute_amplification(
    orientation_deg: float,
    aspect_ratio: float,
) -> dict[str, float]:
    """
    Compute wind amplification for 16 compass directions.

    Formula reasoning:
    - alignment = cos(angle between wind direction and street axis)
      When wind aligns with street (0° diff), cos=1 (max channeling).
      When perpendicular (90° diff), cos=0 (no channeling).
    - Base amplification scales with alignment and aspect ratio.
    - Higher aspect ratio => stronger canyon effect.
    - Cap at 2.5 (safety), floor at 1.0 (no reduction below ambient).
    """
    result = {}
    for direction, wind_deg in COMPASS_DIRS.items():
        # Angle between wind vector and street orientation
        diff = abs(wind_deg - orientation_deg)
        if diff > 180:
            diff = 360 - diff
        if diff > 90:
            diff = 180 - diff  # Street is bidirectional
        alignment = max(0.0, np.cos(np.radians(diff)))

        # Amplification: 1.0 + term that scales with alignment and aspect ratio
        if aspect_ratio <= 1:
            amp = 1.0 + 0.3 * alignment * aspect_ratio
        elif aspect_ratio <= 4:
            amp = 1.0 + 0.3 * alignment + 0.4 * alignment * (aspect_ratio - 1) / 3
        else:
            amp = 1.0 + 0.7 * alignment + 0.5 * alignment * min((aspect_ratio - 4) / 6, 1.0)

        amp = max(AMP_MIN, min(AMP_MAX, amp))
        result[direction] = round(float(amp), 2)

    return result


# =============================================================================
# MAIN PIPELINE
# =============================================================================


def main() -> None:
    """Run full wind amplification pipeline."""
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    DATA_RAW.mkdir(parents=True, exist_ok=True)

    # 1. Load data
    osm_data = _fetch_streets()
    buildings = _fetch_buildings()

    # Clip buildings to Loop
    loop_box = box(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)
    buildings = buildings[buildings.intersects(loop_box)].copy()

    # 2. Build segments (intersection-to-intersection)
    segments = _build_segments_from_osm(osm_data)

    if len(segments) < 150:
        logger.warning(
            "Only %d segments generated (target >= 150). "
            "Consider expanding highway types or bbox.",
            len(segments),
        )

    # 3. Reproject buildings to 3857 once for spatial index
    buildings_3857 = buildings.to_crs("EPSG:3857")

    # 4. Compute aspect ratio and amplification per segment
    output_segments = []
    geojson_features = []

    for seg in segments:
        orientation = segment_bearing(seg["start"], seg["end"])
        aspect = get_aspect_ratio(seg["geometry"], buildings_3857)
        amps = compute_amplification(orientation, aspect)

        # Validate amplification range
        for k, v in amps.items():
            assert AMP_MIN <= v <= AMP_MAX, f"Amplification {k}={v} out of range"

        avg_height = aspect * STREET_WIDTH_M
        output_segments.append({
            "segment_id": seg["id"],
            "start": list(seg["start"]),
            "end": list(seg["end"]),
            "street_name": seg["name"],
            "orientation_deg": round(orientation, 1),
            "avg_building_height_m": round(avg_height, 1),
            "street_width_m": STREET_WIDTH_M,
            "aspect_ratio": round(aspect, 2),
            "amplification_by_direction": amps,
        })

        geom = seg["geometry"]
        coords = [[c[0], c[1]] for c in geom.coords]
        geojson_features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "segment_id": seg["id"],
                "street_name": seg["name"],
                "aspect_ratio": round(aspect, 2),
                "max_amplification": max(amps.values()),
            },
        })

    # 5. Write outputs
    wind_out = {"segments": output_segments}
    with open(DATA_OUT / "wind_amplification.json", "w") as f:
        json.dump(wind_out, f, indent=2)

    geojson_out = {"type": "FeatureCollection", "features": geojson_features}
    with open(DATA_OUT / "street_segments.geojson", "w") as f:
        json.dump(geojson_out, f, indent=2)

    # 6. Summary statistics
    aspects = [s["aspect_ratio"] for s in output_segments]
    max_amps = [max(s["amplification_by_direction"].values()) for s in output_segments]
    high_aspect = sum(1 for a in aspects if a > 6)

    print("\n" + "=" * 50)
    print("P1 Wind Amplification Pipeline — Summary")
    print("=" * 50)
    print(f"  Total segments:        {len(output_segments)}")
    print(f"  Average aspect ratio:  {np.mean(aspects):.2f}")
    print(f"  Max amplification:     {max(max_amps):.2f}")
    print(f"  Segments (aspect > 6): {high_aspect}")
    print("=" * 50)
    print(f"\nOutputs written to:")
    print(f"  {DATA_OUT / 'wind_amplification.json'}")
    print(f"  {DATA_OUT / 'street_segments.geojson'}")


if __name__ == "__main__":
    main()
