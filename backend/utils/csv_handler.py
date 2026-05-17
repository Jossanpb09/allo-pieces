"""CSV import/export utilities for ALLO PIECES 76 products."""
import csv
import io
from typing import List, Dict, Tuple

# Required columns mapping (canonical name -> aliases accepted)
COLUMN_ALIASES = {
    "reference": ["reference", "ref", "référence", "sku", "code"],
    "name": ["name", "nom", "designation", "désignation", "libelle", "libellé", "title", "titre"],
    "price": ["price", "prix", "montant", "tarif"],
    "stock": ["stock", "disponibilité", "disponibilite", "etat", "état", "availability"],
    "category": ["category", "categorie", "catégorie", "type", "famille"],
    "vehicle": ["vehicle", "vehicule", "véhicule", "voiture", "modele", "modèle", "model"],
}

REQUIRED_COLUMNS = ["reference", "name", "price"]
VALID_STOCKS = {"En stock", "Sur commande (24-72h)", "Rupture"}
VALID_CATEGORIES = {"carrosserie", "eclairage", "retroviseur", "refroidissement", "mecanique", "accessoires"}


def detect_mapping(headers: List[str]) -> Dict[str, str]:
    """Auto-detect column mapping from headers."""
    mapping = {}
    normalized = {h.strip().lower(): h for h in headers}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                mapping[canonical] = normalized[alias]
                break
    return mapping


def _normalize_stock(value: str) -> str:
    if not value:
        return "En stock"
    v = value.strip().lower()
    if any(k in v for k in ["rupture", "épuisé", "epuise", "out"]):
        return "Rupture"
    if any(k in v for k in ["commande", "order", "24", "72", "délai", "delai"]):
        return "Sur commande (24-72h)"
    return "En stock"


def _normalize_category(value: str) -> str:
    if not value:
        return ""
    v = value.strip().lower()
    # Direct match
    if v in VALID_CATEGORIES:
        return v
    # Partial keyword match
    if any(k in v for k in ["carross", "body", "pare", "aile", "capot"]):
        return "carrosserie"
    if any(k in v for k in ["éclair", "eclair", "phare", "feu", "light", "lamp"]):
        return "eclairage"
    if any(k in v for k in ["rétro", "retro", "miroir", "mirror"]):
        return "retroviseur"
    if any(k in v for k in ["refroid", "radiateur", "ventil", "cool", "thermo"]):
        return "refroidissement"
    if any(k in v for k in ["mécan", "mecan", "frein", "filtre", "huile", "disque", "engine"]):
        return "mecanique"
    if any(k in v for k in ["access", "led", "kit"]):
        return "accessoires"
    return ""


def parse_csv(content: bytes, custom_mapping: Dict[str, str] = None) -> Tuple[List[Dict], List[Dict], Dict[str, str]]:
    """
    Parse CSV content. Returns (valid_rows, errors, mapping_used).
    Each error has: row, field, message, raw_data.
    """
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            raise ValueError("Encodage de fichier non supporté (UTF-8 ou Latin-1 requis)")

    # Detect dialect (comma or semicolon)
    sample = text[:2048]
    sep = ";" if sample.count(";") > sample.count(",") else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    headers = reader.fieldnames or []
    if not headers:
        raise ValueError("CSV vide ou sans en-tête")

    mapping = custom_mapping if custom_mapping else detect_mapping(headers)

    missing_required = [c for c in REQUIRED_COLUMNS if c not in mapping]
    if missing_required:
        raise ValueError(f"Colonnes obligatoires manquantes: {', '.join(missing_required)}. Mapping détecté: {mapping}")

    valid_rows = []
    errors = []
    seen_refs = set()

    for line_num, row in enumerate(reader, start=2):  # line 1 is header
        try:
            ref = (row.get(mapping.get("reference", ""), "") or "").strip()
            name = (row.get(mapping.get("name", ""), "") or "").strip()
            price_raw = (row.get(mapping.get("price", ""), "") or "").strip().replace(",", ".").replace("€", "").replace(" ", "")
            stock_raw = row.get(mapping.get("stock", ""), "") if "stock" in mapping else ""
            category_raw = row.get(mapping.get("category", ""), "") if "category" in mapping else ""
            vehicle = (row.get(mapping.get("vehicle", ""), "") or "").strip() if "vehicle" in mapping else ""

            row_errors = []
            if not ref:
                row_errors.append({"field": "reference", "message": "Référence vide"})
            if not name:
                row_errors.append({"field": "name", "message": "Nom vide"})

            price = 0.0
            if not price_raw:
                row_errors.append({"field": "price", "message": "Prix vide"})
            else:
                try:
                    price = float(price_raw)
                    if price < 0:
                        row_errors.append({"field": "price", "message": "Prix négatif"})
                except ValueError:
                    row_errors.append({"field": "price", "message": f"Prix non numérique: '{price_raw}'"})

            if ref and ref in seen_refs:
                row_errors.append({"field": "reference", "message": f"Référence dupliquée: '{ref}'"})

            if row_errors:
                for e in row_errors:
                    errors.append({"row": line_num, "field": e["field"], "message": e["message"], "raw": dict(row)})
                continue

            seen_refs.add(ref)
            valid_rows.append({
                "reference": ref,
                "name": name,
                "price": price,
                "stock": _normalize_stock(stock_raw),
                "category": _normalize_category(category_raw),
                "vehicle": vehicle
            })
        except Exception as e:
            errors.append({"row": line_num, "field": "_global", "message": f"Erreur de traitement: {str(e)}", "raw": dict(row) if row else {}})

    return valid_rows, errors, mapping


def generate_error_report_csv(errors: List[Dict]) -> str:
    """Generate CSV string of import errors."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["Ligne", "Champ", "Erreur", "Donnees brutes"])
    for e in errors:
        writer.writerow([e["row"], e["field"], e["message"], str(e.get("raw", ""))])
    return output.getvalue()


def generate_template_csv() -> str:
    """Generate a CSV template for product import."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["reference", "name", "price", "stock", "category", "vehicle"])
    writer.writerow(["PC-CLIO4-AV", "Pare-choc avant Renault Clio 4", "89.90", "En stock", "carrosserie", "Renault Clio 4"])
    writer.writerow(["PH-208-AVG", "Phare avant gauche Peugeot 208", "125.00", "Sur commande (24-72h)", "eclairage", "Peugeot 208"])
    writer.writerow(["FO-MEGANE3", "Filtre à huile Renault Mégane 3", "12.90", "En stock", "mecanique", "Renault Mégane 3"])
    return output.getvalue()
