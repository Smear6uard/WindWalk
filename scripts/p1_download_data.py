"""
P1 Data Download Module

Downloads street segments from OpenStreetMap (Overpass API) and Chicago building
footprint data (GeoJSON). Clips both datasets to the Loop bounding box.

Usage:
    python3 scripts/p1_download_data.py

Outputs:
    data/raw/streets_osm.json  - Raw OSM Overpass response
    data/raw/buildings.geojson - Chicago building footprints (clipped)
"""

import json
import logging
import os
from typing import Any

import geopandas as gpd
import requests
from shapely.geometry import box

# =============================================================================
# CONFIGURATION
# =============================================================================

# Loop bounding box (Chicago): North, South, East, West
BBOX_NORTH = 41.8870
BBOX_SOUTH = 41.8750
BBOX_EAST = -87.6245
BBOX_WEST = -87.6395

# Bbox as (south, west, north, east) for Overpass and GeoPandas
BBOX = (BBOX_SOUTH, BBOX_WEST, BBOX_NORTH, BBOX_EAST)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
CHICAGO_BUILDINGS_URL = (
    "https://data.cityofchicago.org/api/geospatial/hz9b-7nh8"
    "?method=export&format=GeoJSON"
)
# Fallback: Socrata SODA API GeoJSON endpoint
CHICAGO_BUILDINGS_FALLBACK = (
    "https://data.cityofchicago.org/resource/hz9b-7nh8.geojson"
    "?$limit=50000"
)

OUTPUT_DIR = "data/raw"
STREETS_PATH = os.path.join(OUTPUT_DIR, "streets_osm.json")
BUILDINGS_PATH = os.path.join(OUTPUT_DIR, "buildings.geojson")

# Overpass query timeout (seconds)
OVERPASS_TIMEOUT = 60
REQUESTS_TIMEOUT = 120

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# =============================================================================
# FETCH STREETS (Overpass API)
# =============================================================================


def fetch_streets() -> dict[str, Any]:
    """
    Download street ways from OpenStreetMap via Overpass API.

    Queries primary, secondary, tertiary, residential, pedestrian, and footway
    highways within the Loop bounding box. Returns raw Overpass JSON.

    Returns:
        Raw Overpass API response (dict with 'elements' key).

    Raises:
        RuntimeError: On API failure or timeout.
    """
    # Overpass bbox: (south, west, north, east)
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
    logger.info("Fetching street segments from Overpass API...")
    try:
        response = requests.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=OVERPASS_TIMEOUT + 10,
        )
        response.raise_for_status()
        data = response.json()
        if "elements" not in data:
            raise RuntimeError("Overpass response missing 'elements' key")
        logger.info("Fetched %d elements from Overpass", len(data["elements"]))
        return data
    except requests.exceptions.Timeout:
        raise RuntimeError(
            f"Overpass API timeout after {OVERPASS_TIMEOUT}s"
        ) from None
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Overpass API request failed: {e}") from None
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Overpass API returned invalid JSON: {e}") from None


# =============================================================================
# FETCH BUILDINGS
# =============================================================================


def fetch_buildings() -> gpd.GeoDataFrame:
    """
    Download Chicago building footprint data (GeoJSON) and clip to Loop bbox.

    Uses City of Chicago Data Portal geospatial export. Buildings without
    height attributes will use fallback height in downstream processing.

    Returns:
        GeoDataFrame of building footprints in WGS84, clipped to Loop.

    Raises:
        RuntimeError: On download or parse failure.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    logger.info("Fetching Chicago building footprints...")

    gdf = None
    for url, label in [
        (CHICAGO_BUILDINGS_URL, "primary"),
        (CHICAGO_BUILDINGS_FALLBACK, "fallback"),
    ]:
        try:
            # Try direct geopandas read from URL first
            gdf = gpd.read_file(url)
            if gdf is None or len(gdf) == 0:
                logger.warning("%s URL returned empty GeoDataFrame", label)
                continue
            logger.info("Downloaded %d buildings via %s", len(gdf), label)
            break
        except Exception as e:
            logger.warning("%s URL failed: %s", label, e)
            continue
    else:
        # If no URL worked, try loading from cache
        if os.path.exists(BUILDINGS_PATH):
            logger.info("Loading cached buildings from %s", BUILDINGS_PATH)
            gdf = gpd.read_file(BUILDINGS_PATH)
        else:
            raise RuntimeError(
                "Could not fetch buildings from API and no cache exists. "
                "Please download manually from "
                "https://data.cityofchicago.org/widgets/hz9b-7nh8"
            )

    # Ensure WGS84
    if gdf.crs is None:
        gdf.set_crs("EPSG:4326", inplace=True)
    elif gdf.crs != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")

    # Clip to Loop bbox
    bbox_geom = box(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)
    gdf = gdf[gdf.intersects(bbox_geom)].copy()
    gdf = gdf.clip(bbox_geom)
    logger.info("Clipped to %d buildings in Loop bbox", len(gdf))

    # Save for reuse
    gdf.to_file(BUILDINGS_PATH, driver="GeoJSON")
    return gdf


# =============================================================================
# PARSE OSM
# =============================================================================


def parse_osm(osm_data: dict[str, Any]) -> dict[str, Any]:
    """
    Parse raw Overpass response into nodes and ways.

    Extracts node coordinates and way geometries. Does not perform
    intersection splitting; that is done in p1_build_wind_model.

    Args:
        osm_data: Raw Overpass API response.

    Returns:
        Dict with 'nodes' (id -> (lat, lon)) and 'ways' (list of way dicts).
    """
    nodes = {}
    ways = []
    for el in osm_data.get("elements", []):
        if el["type"] == "node":
            nodes[el["id"]] = (el["lat"], el["lon"])
        elif el["type"] == "way" and "nodes" in el:
            ways.append(el)
    logger.info("Parsed %d nodes and %d ways from OSM", len(nodes), len(ways))
    return {"nodes": nodes, "ways": ways}


# =============================================================================
# MAIN
# =============================================================================


def main() -> None:
    """Download streets and buildings, save to data/raw."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Fetch and save streets
    streets_data = fetch_streets()
    with open(STREETS_PATH, "w") as f:
        json.dump(streets_data, f, indent=2)
    logger.info("Saved streets to %s", STREETS_PATH)

    # Parse (for validation)
    parsed = parse_osm(streets_data)
    logger.info("Parsed %d ways", len(parsed["ways"]))

    # Fetch and save buildings
    buildings = fetch_buildings()
    logger.info("Buildings saved to %s", BUILDINGS_PATH)

    logger.info("Download complete.")


if __name__ == "__main__":
    main()
