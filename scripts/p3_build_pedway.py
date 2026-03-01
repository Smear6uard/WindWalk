#!/usr/bin/env python3
"""
Validate data/pedway_network.json and generate data/pedway_validation.html.
Run from project root: python scripts/p3_build_pedway.py
Uses only standard library.
"""

import json
import math
import os
import sys

# Paths: run from project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(ROOT, "data")
PEDWAY_JSON = os.path.join(DATA_DIR, "pedway_network.json")
OUTPUT_HTML = os.path.join(DATA_DIR, "pedway_validation.html")

REQUIRED_SEGMENT_FIELDS = {
    "segment_id", "name", "surface_entry", "surface_exit", "distance_m",
    "is_accessible", "hours", "entry_description", "exit_description",
}
LAT_MIN, LAT_MAX = 41.875, 41.890
LON_MIN, LON_MAX = -87.641, -87.622
DISTANCE_MIN_RATIO, DISTANCE_MAX_RATIO = 0.5, 3.5


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line distance in meters between two WGS84 points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def coord_key(lat: float, lon: float) -> tuple:
    """Round for stable grouping of junction nodes."""
    return (round(lat, 5), round(lon, 5))


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    if not os.path.isfile(PEDWAY_JSON):
        print(f"✗ Error: {PEDWAY_JSON} not found.")
        sys.exit(1)

    with open(PEDWAY_JSON, encoding="utf-8") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    entry_points = data.get("entry_points", [])

    errors = 0
    warnings = 0

    # --- Check 1: Segment count >= 8 ---
    if len(segments) >= 8:
        print(f"✓ Segment count is {len(segments)} (≥ 8)")
    else:
        print(f"✗ Segment count is {len(segments)} (required ≥ 8)")
        errors += 1

    # --- Check 2: Required fields on every segment ---
    seg_ok = True
    for s in segments:
        missing = REQUIRED_SEGMENT_FIELDS - set(s.keys())
        if missing:
            print(f"✗ Segment missing fields: {missing} (segment_id: {s.get('segment_id', '?')})")
            seg_ok = False
            errors += 1
    if seg_ok:
        print("✓ Every segment has all required fields")

    # --- Check 3: Coordinates in Loop bounding box ---
    def in_bbox(lat: float, lon: float) -> bool:
        return (LAT_MIN <= lat <= LAT_MAX) and (LON_MIN <= lon <= LON_MAX)

    bbox_ok = True
    for s in segments:
        for label, coord in [("surface_entry", s.get("surface_entry")), ("surface_exit", s.get("surface_exit"))]:
            if coord is None or len(coord) < 2:
                continue
            lat, lon = coord[0], coord[1]
            if not in_bbox(lat, lon):
                print(f"✗ Coordinate outside Loop: {label} {coord} in segment {s.get('segment_id', '?')}")
                bbox_ok = False
                errors += 1
    for ep in entry_points:
        coord = ep.get("coordinates")
        if coord is not None and len(coord) >= 2:
            lat, lon = coord[0], coord[1]
            if not in_bbox(lat, lon):
                print(f"✗ Entry point coordinate outside Loop: {ep.get('id', '?')} {coord}")
                bbox_ok = False
                errors += 1
    if bbox_ok:
        print("✓ All coordinates within Loop bounding box")

    # --- Check 4: distance_m between 0.5x and 3.5x haversine (print every segment) ---
    segment_ids = {s["segment_id"] for s in segments}
    for s in segments:
        entry = s.get("surface_entry")
        exit_ = s.get("surface_exit")
        declared = s.get("distance_m")
        name = s.get("name", "?")
        if entry and exit_ and len(entry) >= 2 and len(exit_) >= 2 and declared is not None:
            straight = haversine_m(entry[0], entry[1], exit_[0], exit_[1])
            ratio = declared / straight if straight > 0 else 0
            print(f"  {name}: declared={declared} m, straight-line={straight:.0f} m")
            if not (DISTANCE_MIN_RATIO <= ratio <= DISTANCE_MAX_RATIO):
                print(f"⚠ Declared distance ratio {ratio:.2f}x outside [0.5, 3.5] for: {name}")
                warnings += 1
        else:
            print(f"  {name}: (missing coords or distance_m, skip haversine)")
    print("✓ Distance check done (see above for each segment)")

    # --- Check 5: At least 3 junction nodes ---
    coord_counts = {}
    for s in segments:
        for label in ("surface_entry", "surface_exit"):
            c = s.get(label)
            if c and len(c) >= 2:
                k = coord_key(c[0], c[1])
                coord_counts[k] = coord_counts.get(k, 0) + 1
    junctions = sum(1 for n in coord_counts.values() if n >= 2)
    if junctions >= 3:
        print(f"✓ Junction nodes (coords shared by ≥2 segments): {junctions}")
    else:
        print(f"⚠ Fewer than 3 junction nodes: {junctions}")
        warnings += 1

    # --- Check 6: connected_segments reference existing segment_ids ---
    ref_ok = True
    for ep in entry_points:
        for seg_id in ep.get("connected_segments", []):
            if seg_id not in segment_ids:
                print(f"✗ Entry point {ep.get('id', '?')} references missing segment_id: {seg_id}")
                ref_ok = False
                errors += 1
    if ref_ok:
        print("✓ All connected_segments reference existing segments")

    # --- Summary ---
    if errors == 0:
        print("Result: PASS ✓")
    else:
        print("Result: FAIL ✗")

    # --- Part 2: Generate HTML map ---
    # Escape JSON for embedding in HTML (avoid breaking </script>)
    def embed_json(obj):
        s = json.dumps(obj)
        return s.replace("<", "\\u003c").replace("</", "<\\/")

    segments_js = embed_json(segments)
    entry_points_js = embed_json(entry_points)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedway validation map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    body {{ margin: 0; font-family: system-ui, sans-serif; }}
    #map {{ height: 100vh; }}
    .legend {{ position: absolute; bottom: 24px; right: 24px; background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; font-size: 13px; line-height: 1.5; }}
    .legend h4 {{ margin: 0 0 8px 0; }}
    .legend .swatch {{ display: inline-block; width: 24px; height: 4px; margin-right: 8px; vertical-align: middle; }}
    .legend .dot {{ display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #333; margin-right: 8px; vertical-align: middle; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="legend">
    <h4>Legend</h4>
    <div><span class="swatch" style="background:#7C83FD; border-bottom: 2px dashed #7C83FD;"></span> Tunnel segment</div>
    <div><span class="dot" style="background:#4ECDC4;"></span> Entry point</div>
    <div><span class="dot" style="background:#FF6B6B;"></span> Exit point</div>
    <p style="margin: 12px 0 0 0;">Segments: <strong id="segCount">0</strong> &nbsp; Entry points: <strong id="entryCount">0</strong></p>
  </div>
  <script>
    var segments = {segments_js};
    var entryPoints = {entry_points_js};

    var map = L.map("map").setView([41.8825, -87.6280], 16);
    L.tileLayer("https://{{{{s}}.tile.openstreetmap.org/{{{{z}}}}/{{{{x}}}}/{{{{y}}}}.png", {{ attribution: "© OpenStreetMap" }}).addTo(map);

    segments.forEach(function(seg) {{
      var entry = seg.surface_entry;
      var exit = seg.surface_exit;
      if (entry && entry.length >= 2 && exit && exit.length >= 2) {{
        var line = L.polyline([ [entry[0], entry[1]], [exit[0], exit[1]] ], {{
          color: "#7C83FD",
          weight: 5,
          dashArray: "8, 8"
        }}).addTo(map);
        line.bindPopup("<b>" + (seg.name || "") + "</b><br>ID: " + (seg.segment_id || "") + "<br>Distance: " + (seg.distance_m != null ? seg.distance_m + " m" : "—") + "<br>Accessible: " + (seg.is_accessible ? "yes" : "no") + "<br>Hours: " + (seg.hours || "—"));
      }}
    }});

    segments.forEach(function(seg) {{
      var exit = seg.surface_exit;
      if (exit && exit.length >= 2) {{
        var circle = L.circleMarker([exit[0], exit[1]], {{ radius: 5, fillColor: "#FF6B6B", color: "white", weight: 2, fillOpacity: 1 }}).addTo(map);
        circle.bindPopup("EXIT: " + (seg.name || ""));
      }}
    }});

    entryPoints.forEach(function(ep) {{
      var c = ep.coordinates;
      if (c && c.length >= 2) {{
        var circle = L.circleMarker([c[0], c[1]], {{ radius: 8, fillColor: "#4ECDC4", color: "white", weight: 2, fillOpacity: 1 }}).addTo(map);
        circle.bindPopup("<b>" + (ep.name || "") + "</b><br>" + (ep.description || ""));
      }}
    }});

    document.getElementById("segCount").textContent = segments.length;
    document.getElementById("entryCount").textContent = entryPoints.length;
  </script>
</body>
</html>
"""
    # Fix tile URL: double braces from f-string escape -> single for Leaflet {s},{z},{x},{y}
    html = html.replace("{{s}.tile", "{s}.tile").replace("{{z}}", "{z}").replace("{{x}}", "{x}").replace("{{y}}", "{y}")

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    try:
        rel_path = os.path.relpath(OUTPUT_HTML, ROOT)
    except ValueError:
        rel_path = OUTPUT_HTML
    print(f"✓ Validation map saved to: {rel_path}")


if __name__ == "__main__":
    main()
