"""
Import script for B-AUTO CSV (English → French translation + category mapping).
Reads CSV at /tmp/user_products.csv and inserts/updates products in MongoDB.
Usage: python3 /app/backend/scripts/import_b_auto_csv.py
"""
import csv
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
CSV_PATH = "/tmp/user_products.csv"

# Translation map: English Part name → French
PART_NAME_FR = {
    "Bumper, front": "Pare-chocs avant",
    "Bumper, rear": "Pare-chocs arrière",
    "Bumper bar-carrier-beam": "Renfort de pare-chocs",
    "Bumper bracket": "Support de pare-chocs",
    "Bumper corner": "Coin de pare-chocs",
    "Bumper cover": "Cache de pare-chocs",
    "Bumper grill": "Calandre de pare-chocs",
    "Bumper grill cover": "Cache calandre pare-chocs",
    "Bumper grill moulding": "Enjoliveur calandre pare-chocs",
    "Bumper grille frame": "Cadre calandre pare-chocs",
    "Bumper moulding": "Baguette de pare-chocs",
    "Bumper reinforcement": "Renfort de pare-chocs",
    "Bumper spoiler, front": "Spoiler de pare-chocs avant",
    "Bumper spoiler, rear": "Spoiler de pare-chocs arrière",
    "Under bumper cover": "Cache sous pare-chocs",
    "Absorber": "Absorbeur",
    "Headlamp": "Phare",
    "Headlamp fastening": "Fixation de phare",
    "Headlamp moulding": "Enjoliveur de phare",
    "Headlamp repair kit": "Kit de réparation de phare",
    "Upper headlamp moulding": "Enjoliveur supérieur de phare",
    "Head lamp seat": "Support de phare",
    "Front fog lamp": "Antibrouillard avant",
    "Front fog lamp with daytime running light": "Antibrouillard avant avec feu de jour",
    "Fog lamp fastening": "Fixation antibrouillard",
    "Fog lamp frame": "Cadre antibrouillard",
    "Fog lamp hole cover": "Cache trou antibrouillard",
    "Rear fog lamp": "Antibrouillard arrière",
    "Daytime running light": "Feu de jour",
    "Front indicator": "Clignotant avant",
    "Side indicator": "Répétiteur latéral",
    "Mirror side indicator": "Clignotant de rétroviseur",
    "Signal lamp": "Feu de signalisation",
    "Brake light": "Feu stop",
    "Tail light": "Feu arrière",
    "Tail light lens": "Verre de feu arrière",
    "Reversing lamp": "Feu de recul",
    "Reflex reflector": "Catadioptre",
    "Rear reflector frame": "Cadre catadioptre arrière",
    "Door mirror": "Rétroviseur de porte",
    "Door mirror cover": "Coque de rétroviseur",
    "Door mirror glass": "Glace de rétroviseur",
    "Door mirror glass base": "Support de glace de rétroviseur",
    "Door cover": "Garniture de porte",
    "Door moulding": "Baguette de porte",
    "Door handle mechanism": "Mécanisme de poignée de porte",
    "Outside door  handle": "Poignée de porte extérieure",
    "Outside door handle": "Poignée de porte extérieure",
    "Rear door moulding": "Baguette de porte arrière",
    "Bonnet": "Capot",
    "Bonnet hinge": "Charnière de capot",
    "Fender, front": "Aile avant",
    "Fender arch (moulding)": "Élargisseur d'aile",
    "Fender bracket, front": "Support d'aile avant",
    "Fender molding": "Baguette d'aile",
    "Plastic inner fender": "Pare-boue plastique intérieur",
    "Front panel": "Panneau avant (façade)",
    "Front panel brace": "Renfort de panneau avant",
    "Front panel support": "Support de panneau avant",
    "Front panel upper moulding": "Enjoliveur supérieur panneau avant",
    "Crossmember": "Traverse",
    "Grill": "Calandre",
    "Grill badge": "Logo de calandre",
    "Grill cover": "Cache de calandre",
    "Grill frame": "Cadre de calandre",
    "Grill moulding": "Enjoliveur de calandre",
    "Grille support": "Support de calandre",
    "B pillar molding": "Enjoliveur de montant central (pilier B)",
    "Side molding": "Baguette latérale",
    "Moulding": "Enjoliveur / baguette",
    "Number plate support": "Support de plaque d'immatriculation",
    "Under engine cover": "Cache sous moteur",
    "Windshield washer tank": "Bocal de lave-glace",
}

# Category mapping based on Assortment Group + keywords
CATEGORY_BY_GROUP = {
    "Body parts": "carrosserie",
    "Lighting": "eclairage",
    "Mirrors and their components": "retroviseur",
    "Wipers, Arms, Transmissions & Washer parts": "accessoires",
    "Handles, locking and ignition lock parts": "accessoires",
}

# More precise category mapping by Part Kind
CATEGORY_BY_KIND = {
    "Exterior mirrors and their components": "retroviseur",
    "Side indicators (also in mirrors) and associated parts": "eclairage",
    "Headlamps and associated parts": "eclairage",
    "Front fog lamps, covers and associated parts": "eclairage",
    "Front fog lamps with daytime running lights and associated parts": "eclairage",
    "Daytime running lights and associated parts": "eclairage",
    "Tail lights and associated parts": "eclairage",
    "Tail fog lamps, covers and associated parts": "eclairage",
    "Brake lights and associated parts": "eclairage",
    "Reversing lights and associated parts": "eclairage",
    "Marker lights and associated parts": "eclairage",
    "Front indicators and associated parts": "eclairage",
    "Optical blendes, reflective elements": "eclairage",
    "Washer pumps, nozzles, installation connectors and washer tanks": "accessoires",
    "Handles, locking and ignition-starter parts": "accessoires",
}


def translate_name(part_name: str, part_kind: str) -> str:
    """Return French name, fall back to original if unknown."""
    fr = PART_NAME_FR.get(part_name)
    if fr:
        return fr
    # Heuristic translation for unmapped entries
    n = part_name.strip()
    return n  # keep original if no translation found


def detect_category(group: str, kind: str) -> str:
    if kind in CATEGORY_BY_KIND:
        return CATEGORY_BY_KIND[kind]
    if group in CATEGORY_BY_GROUP:
        return CATEGORY_BY_GROUP[group]
    return "accessoires"


def parse_price(value: str) -> float:
    if not value:
        return 0.0
    # CSV uses comma as decimal sep
    return float(value.replace(",", ".").replace(" ", "").replace("\xa0", ""))


def determine_stock(quantity_str: str) -> str:
    try:
        q = int(quantity_str or "0")
    except ValueError:
        q = 0
    if q >= 1:
        return "En stock"
    return "Sur commande (24-72h)"


def main():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    coll = db.products

    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    print(f"Loaded {len(rows)} rows from CSV")

    inserted = 0
    updated = 0
    skipped = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    untranslated = set()

    bulk_inserts = []
    for r in rows:
        try:
            ref = (r.get("Part number") or "").strip()
            if not ref:
                skipped += 1
                continue

            part_name = (r.get("Part name") or "").strip()
            part_kind = (r.get("Part Kind") or "").strip()
            assortment = (r.get("Assortment Group") or "").strip()

            fr_name = translate_name(part_name, part_kind)
            if part_name and part_name not in PART_NAME_FR:
                untranslated.add(part_name)

            # Use Gross price (TTC) for retail display
            price = parse_price(r.get("Gross price") or r.get("Net price") or "0")
            if price <= 0:
                price = parse_price(r.get("Net price") or "0")

            stock = determine_stock(r.get("Quantity"))
            category = detect_category(assortment, part_kind)

            # Build full French name: include part kind context if helpful
            display_name = fr_name
            # For clarity append the assortment group if it adds info
            full_name = display_name

            doc_data = {
                "name": full_name,
                "price": round(price, 2),
                "stock": stock,
                "category": category,
                "vehicle": None,  # not available in source
                "description": f"Source: {part_kind} — {assortment}",
                "updated_at": now_iso,
                "is_deleted": False,
            }

            existing = coll.find_one({"reference": ref}, {"_id": 1})
            if existing:
                coll.update_one({"reference": ref}, {"$set": doc_data})
                updated += 1
            else:
                new_doc = {
                    "id": str(uuid.uuid4()),
                    "reference": ref,
                    "images": [],
                    "pdf": None,
                    "featured": False,
                    "featured_order": 0,
                    "deleted_at": None,
                    "created_at": now_iso,
                    **doc_data,
                }
                bulk_inserts.append(new_doc)
                if len(bulk_inserts) >= 500:
                    coll.insert_many(bulk_inserts)
                    inserted += len(bulk_inserts)
                    bulk_inserts = []
        except Exception as e:
            print(f"ERROR row {r.get('Part number')}: {e}")
            skipped += 1

    if bulk_inserts:
        coll.insert_many(bulk_inserts)
        inserted += len(bulk_inserts)

    print(f"\n=== IMPORT COMPLETE ===")
    print(f"Inserted: {inserted}")
    print(f"Updated:  {updated}")
    print(f"Skipped:  {skipped}")
    print(f"Total products in DB: {coll.count_documents({'is_deleted': {'$ne': True}})}")

    if untranslated:
        print(f"\n=== {len(untranslated)} part names NOT translated (kept as-is) ===")
        for n in sorted(untranslated):
            print(f"  - {n}")

    client.close()


if __name__ == "__main__":
    main()
