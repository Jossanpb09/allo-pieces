"""File upload/processing utilities for ALLO PIECES 76 admin."""
import os
import uuid
from pathlib import Path
from typing import Tuple
from PIL import Image
from fastapi import HTTPException, UploadFile

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
PRODUCTS_DIR = UPLOADS_DIR / "products"
THUMBS_DIR = UPLOADS_DIR / "thumbnails"
PDFS_DIR = UPLOADS_DIR / "pdfs"
LOGOS_DIR = UPLOADS_DIR / "logos"
PROMOTIONS_DIR = UPLOADS_DIR / "promotions"

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_PDF_MIMES = {"application/pdf"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_PDF_SIZE = 10 * 1024 * 1024  # 10MB
MAX_WIDTH = 2048
THUMB_SIZE = (300, 300)


def _ensure_dirs():
    for d in (PRODUCTS_DIR, THUMBS_DIR, PDFS_DIR, LOGOS_DIR, PROMOTIONS_DIR):
        d.mkdir(parents=True, exist_ok=True)


async def save_image(file: UploadFile, subdir: str = "products") -> dict:
    """Save and process image: resize max width 2048, convert to WebP, generate thumbnail."""
    _ensure_dirs()

    if file.content_type not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(status_code=400, detail=f"Type d'image non autorisé: {file.content_type}. Acceptés: JPG, PNG, WebP.")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 5 Mo)")

    # Use BytesIO for Pillow
    from io import BytesIO
    try:
        img = Image.open(BytesIO(content))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Fichier image invalide ou corrompu")

    if img.mode in ("RGBA", "LA", "P"):
        # Keep transparency for PNG -> convert to RGB on white background for jpg/webp
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize main image if needed
    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        new_height = int(img.height * ratio)
        img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)

    file_id = str(uuid.uuid4())
    target_dir = UPLOADS_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)

    main_filename = f"{file_id}.webp"
    main_path = target_dir / main_filename
    img.save(main_path, "WEBP", quality=85, method=6)

    # Generate thumbnail
    thumb = img.copy()
    thumb.thumbnail(THUMB_SIZE, Image.LANCZOS)
    thumb_filename = f"{file_id}_thumb.webp"
    thumb_path = THUMBS_DIR / thumb_filename
    thumb.save(thumb_path, "WEBP", quality=80, method=6)

    return {
        "id": file_id,
        "url": f"/uploads/{subdir}/{main_filename}",
        "thumbnail_url": f"/uploads/thumbnails/{thumb_filename}",
        "filename": file.filename,
        "size": len(content)
    }


async def save_pdf(file: UploadFile) -> dict:
    """Save PDF file with MIME validation, max 10MB."""
    _ensure_dirs()

    if file.content_type not in ALLOWED_PDF_MIMES:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé: {file.content_type}. PDF requis.")

    content = await file.read()
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF trop volumineux (max 10 Mo)")

    # Verify PDF magic bytes
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Fichier PDF invalide ou corrompu")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    path = PDFS_DIR / filename

    with open(path, "wb") as f:
        f.write(content)

    return {
        "id": file_id,
        "url": f"/uploads/pdfs/{filename}",
        "filename": file.filename,
        "size": len(content)
    }


async def save_logo(file: UploadFile) -> dict:
    """Save logo image (no thumbnail, just resize)."""
    _ensure_dirs()

    if file.content_type not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(status_code=400, detail="Format non autorisé. Utilisez JPG, PNG ou WebP.")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Logo trop volumineux (max 5 Mo)")

    from io import BytesIO
    try:
        img = Image.open(BytesIO(content))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Image invalide")

    # Preserve transparency for logo
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    if img.width > 1024:
        ratio = 1024 / img.width
        new_height = int(img.height * ratio)
        img = img.resize((1024, new_height), Image.LANCZOS)

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.webp"
    path = LOGOS_DIR / filename
    img.save(path, "WEBP", quality=95, method=6)

    return {
        "id": file_id,
        "url": f"/uploads/logos/{filename}",
        "filename": file.filename
    }


def delete_file_by_url(url: str) -> bool:
    """Delete a file given its public URL path."""
    if not url or not url.startswith("/uploads/"):
        return False
    relative = url.replace("/uploads/", "", 1)
    full_path = UPLOADS_DIR / relative
    try:
        if full_path.exists() and full_path.is_file():
            full_path.unlink()
            # Also remove thumbnail if exists
            stem = full_path.stem
            thumb_path = THUMBS_DIR / f"{stem}_thumb.webp"
            if thumb_path.exists():
                thumb_path.unlink()
            return True
    except Exception:
        return False
    return False
