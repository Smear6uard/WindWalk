import requests
import json
import numpy as np
import os
import geopandas as gpd
from shapely.geometry import LineString

# ===============================
# CONFIG
# ===============================

BBOX = (41.8750, -87.6395, 41.8870, -87.6245)  # south, west, north, east
DEFAULT_WIDTH = 20

COMPASS_DIRS = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5,
    "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5
}

# ===============================
# STEP 1 — FETCH STREETS
# ===============================

def fetch_streets():
    overpass_url = "http://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    way["highway"~"primary|secondary|tertiary|residential|pedestrian|footway"]
      ({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
    out body;
    >;
    out skel qt;
    """
    response = requests.get(overpass_url, params={"data": query})
    return response.json()

# ===============================
# STEP 2 — BUILD SEGMENTS
# ===============================

def build_segments(osm_data):
    nodes = {}
    for el in osm_data["elements"]:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lat"], el["lon"])

    segments = []
    seg_id = 0

    for el in osm_data["elements"]:
        if el["type"] == "way" and "nodes" in el:
            name = el.get("tags", {}).get("name", "Unknown")
            for i in range(len(el["nodes"]) - 1):
                n1 = nodes.get(el["nodes"][i])
                n2 = nodes.get(el["nodes"][i+1])
                if n1 and n2:
                    line = LineString([(n1[1], n1[0]), (n2[1], n2[0])])
                    segments.append({
                        "id": f"seg_{seg_id}",
                        "geometry": line,
                        "start": n1,
                        "end": n2,
                        "name": name
                    })
                    seg_id += 1

    return segments

# ===============================
# STEP 3 — FETCH BUILDINGS
# ===============================

def fetch_buildings():
    url = "https://data.cityofchicago.org/api/geospatial/hz9b-7nh8?method=export&type=GeoJSON"
    path = "data/raw/buildings.geojson"

    os.makedirs("data/raw", exist_ok=True)

    if not os.path.exists(path):
        print("Downloading building footprints...")
        r = requests.get(url)
        with open(path, "wb") as f:
            f.write(r.content)

    return gpd.read_file(path)

# ===============================
# STEP 4 — ASPECT RATIO
# ===============================

def get_aspect_ratio(segment_geom, buildings):
    buffer = segment_geom.buffer(0.0003)
    nearby = buildings[buildings.intersects(buffer)]

    if len(nearby) == 0:
        return 0.5

    height_col = None
    for col in buildings.columns:
        if "height" in col.lower():
            height_col = col
            break

    if height_col:
        heights = nearby[height_col].dropna()
        if len(heights) > 0:
            avg_height = heights.mean()
        else:
            avg_height = 40
    else:
        avg_height = 40

    return avg_height / DEFAULT_WIDTH

# ===============================
# STEP 5 — WIND MODEL
# ===============================

def segment_bearing(start, end):
    lat1, lon1 = start
    lat2, lon2 = end
    dlon = np.radians(lon2 - lon1)
    lat1 = np.radians(lat1)
    lat2 = np.radians(lat2)
    x = np.sin(dlon) * np.cos(lat2)
    y = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
    return np.degrees(np.arctan2(x, y)) % 360


def compute_amplification(orientation, aspect_ratio):
    result = {}
    for direction, wind_deg in COMPASS_DIRS.items():
        diff = abs(wind_deg - orientation) % 180
        if diff > 90:
            diff = 180 - diff

        alignment = np.cos(np.radians(diff))

        if aspect_ratio <= 1:
            amp = 1.0 + 0.2 * alignment
        elif aspect_ratio <= 4:
            amp = 1.0 + 0.5 * alignment * (aspect_ratio / 4)
        else:
            amp = 1.0 + (0.5 + 0.5 * min(aspect_ratio / 10, 1.0)) * alignment

        if aspect_ratio > 6:
            amp *= 1.1

        result[direction] = round(min(amp, 2.5), 2)

    return result

# ===============================
# MAIN
# ===============================

def main():
    print("Downloading streets...")
    osm = fetch_streets()

    print("Building segments...")
    segments = build_segments(osm)

    print("Loading buildings...")
    buildings = fetch_buildings()
    buildings = buildings.cx[BBOX[1]:BBOX[3], BBOX[0]:BBOX[2]]

    output = {"segments": []}
    geojson_features = []

    print("Computing wind model...")

    for seg in segments:
        orientation = segment_bearing(seg["start"], seg["end"])
        aspect = get_aspect_ratio(seg["geometry"], buildings)
        amps = compute_amplification(orientation, aspect)

        output["segments"].append({
            "segment_id": seg["id"],
            "start": list(seg["start"]),
            "end": list(seg["end"]),
            "street_name": seg["name"],
            "orientation_deg": round(orientation, 1),
            "avg_building_height_m": round(aspect * DEFAULT_WIDTH, 1),
            "street_width_m": DEFAULT_WIDTH,
            "aspect_ratio": round(aspect, 2),
            "amplification_by_direction": amps
        })

        geojson_features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": list(seg["geometry"].coords)
            },
            "properties": {
                "segment_id": seg["id"],
                "street_name": seg["name"],
                "aspect_ratio": round(aspect, 2),
                "max_amplification": max(amps.values())
            }
        })

    os.makedirs("data", exist_ok=True)

    with open("data/wind_amplification.json", "w") as f:
        json.dump(output, f, indent=2)

    with open("data/street_segments.geojson", "w") as f:
        json.dump({
            "type": "FeatureCollection",
            "features": geojson_features
        }, f, indent=2)

    print("Done. Generated", len(output["segments"]), "segments.")

if __name__ == "__main__":
    main()