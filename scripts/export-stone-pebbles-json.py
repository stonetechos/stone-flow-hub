#!/usr/bin/env python3
"""
Generates src/data/stone-pebbles-catalog.json with all 75 authentic items.
"""

import os
import json
import sys

# Import PEBBLES from generate-stone-pebbles-catalogue.py
sys.path.insert(0, os.path.dirname(__file__))
from importlib.machinery import SourceFileLoader

pebble_gen = SourceFileLoader("pebble_gen", os.path.join(os.path.dirname(__file__), "generate-stone-pebbles-catalogue.py")).load_module()

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_JSON = os.path.join(REPO_DIR, "src/data/stone-pebbles-catalog.json")

def get_pricing(cat, name):
    if "Semi-Precious" in cat:
        return 120, "kg"
    elif "Onyx" in cat:
        return 85, "kg"
    elif "Jumbo" in cat:
        return 45, "kg"
    elif "Mini" in cat or "Chips" in cat:
        return 28, "kg"
    elif "Decorative" in cat:
        return 95, "kg"
    else:
        return 38, "kg"

def get_hardness(cat, mineral):
    if "Quartz" in mineral or "Agate" in mineral:
        return "7.0 Mohs (High Quartz Scratch Resistance)"
    elif "Onyx" in mineral or "Calcite" in mineral:
        return "3.5 - 4.5 Mohs (Translucent Crystalline)"
    elif "Basalt" in mineral or "Amphibolite" in mineral:
        return "6.0 - 6.5 Mohs (Heavy-Duty Volcanic)"
    elif "Granite" in mineral:
        return "6.5 Mohs (Igneous Structural)"
    elif "Sandstone" in mineral:
        return "5.5 - 6.0 Mohs (Sedimentary Weathered)"
    else:
        return "5.5 - 6.5 Mohs (Architectural Grade)"

catalog = []
for p in pebble_gen.PEBBLES:
    price, unit = get_pricing(p["category"], p["name"])
    hardness = get_hardness(p["category"], p["mineral"])
    apps = [a.strip() for a in p["use"].split(",")]
    item_id = p["id"]
    
    catalog.append({
        "id": p["code"],
        "index": item_id,
        "code": p["code"],
        "name": p["name"],
        "fullName": f"{p['name']} Architectural Natural Stone Pebbles",
        "slug": p["name"].lower().replace(" ", "-").replace("'", "").replace("&", "and"),
        "category": p["category"],
        "mineral": p["mineral"],
        "finish": p["finish"],
        "sizes": p["sizes"],
        "color": p["color"],
        "image": f"/catalogues/stone-pebbles-assets/pebble_{item_id:03d}.jpg",
        "price": price,
        "unit": unit,
        "hardness": hardness,
        "applications": apps,
        "packaging": "25 kg UV Bag / 1.0 MT Jumbo Bulk / Wooden Crate",
        "leadTime": "In Stock · Ready to Dispatch",
        "badge": "100% Natural River / Quarry Aggregate",
        "desc": p["desc"]
    })

with open(OUTPUT_JSON, "w") as f:
    json.dump(catalog, f, indent=2)

print(f"Successfully generated {len(catalog)} products in {OUTPUT_JSON}!")
