"""
ALLO PIECES 76 - Phase 2 backend test suite.

Covers:
- Auth & admin route protection
- Products (soft-delete, restore, permanent, trash, featured/pin)
- Uploads (images, PDF, logo)
- CSV template/preview/confirm
- Promotions CRUD
- Quick Links CRUD + reorder
- Feature toggles
- Site settings
- Pro registrations
- Forgot/reset password
- Audit log & analytics
- Seed verification
"""
import io
import os
import uuid

import pytest
import requests
from PIL import Image

from .conftest import BASE_URL


# ---------- helpers ----------
def _png_bytes(color=(255, 0, 0), size=(80, 80)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    buf.seek(0)
    return buf


def _pdf_bytes():
    # Minimal valid PDF
    return io.BytesIO(
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n"
        b"xref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n"
        b"trailer<</Size 3/Root 1 0 R>>\nstartxref\n95\n%%EOF\n"
    )


# ---------- Auth ----------
class TestAuth:
    def test_login_ok(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@allopieces76.fr", "password": "admin123"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_bad(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@allopieces76.fr", "password": "WRONG"},
        )
        assert r.status_code == 401

    @pytest.mark.parametrize(
        "path",
        [
            "/api/admin/promotions",
            "/api/admin/quicklinks",
            "/api/admin/feature-toggles",
            "/api/admin/pro-registrations",
            "/api/admin/audit-log",
            "/api/admin/analytics",
            "/api/products/trash/list",
            "/api/admin/products/csv-template",
        ],
    )
    def test_admin_routes_require_auth(self, api_client, path):
        r = api_client.get(f"{BASE_URL}{path}")
        assert r.status_code in (401, 403), f"{path} returned {r.status_code}"


# ---------- Products ----------
class TestProducts:
    def test_list_excludes_soft_deleted(self, api_client, auth_headers):
        # Create product
        payload = {
            "reference": f"TEST_SD_{uuid.uuid4().hex[:8]}",
            "name": "TEST SoftDelete Product",
            "price": 10.0,
            "stock": "En stock",
            "images": [],
        }
        r = api_client.post(f"{BASE_URL}/api/products", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # Verify it's in public list
        r = api_client.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # Soft delete
        r = api_client.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)
        assert r.status_code == 200

        # Should no longer be in public list
        r = api_client.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        assert not any(p["id"] == pid for p in r.json()), "Soft-deleted product still listed!"

        # Should appear in trash
        r = api_client.get(f"{BASE_URL}/api/products/trash/list", headers=auth_headers)
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # Restore
        r = api_client.post(f"{BASE_URL}/api/products/{pid}/restore", headers=auth_headers)
        assert r.status_code == 200

        r = api_client.get(f"{BASE_URL}/api/products")
        assert any(p["id"] == pid for p in r.json())

        # Permanent delete
        r = api_client.delete(f"{BASE_URL}/api/products/{pid}/permanent", headers=auth_headers)
        assert r.status_code == 200
        r = api_client.get(f"{BASE_URL}/api/products/{pid}")
        assert r.status_code == 404

    def test_featured_pin(self, api_client, auth_headers):
        payload = {
            "reference": f"TEST_FEAT_{uuid.uuid4().hex[:8]}",
            "name": "TEST Featured",
            "price": 22.0,
            "stock": "En stock",
            "images": [],
        }
        r = api_client.post(f"{BASE_URL}/api/products", json=payload, headers=auth_headers)
        assert r.status_code == 200
        pid = r.json()["id"]
        try:
            # Pin
            r = api_client.post(f"{BASE_URL}/api/products/{pid}/pin", headers=auth_headers)
            assert r.status_code == 200
            assert r.json()["featured"] is True

            # Verify featured query
            r = api_client.get(f"{BASE_URL}/api/products?featured=true")
            assert r.status_code == 200
            assert any(p["id"] == pid for p in r.json())
            assert all(p.get("featured") for p in r.json())

            # Unpin
            r = api_client.post(f"{BASE_URL}/api/products/{pid}/pin", headers=auth_headers)
            assert r.json()["featured"] is False
        finally:
            api_client.delete(f"{BASE_URL}/api/products/{pid}/permanent", headers=auth_headers)


# ---------- Uploads ----------
class TestUploads:
    def test_upload_images(self, auth_headers):
        files = [
            ("files", ("a.png", _png_bytes((255, 0, 0)), "image/png")),
            ("files", ("b.png", _png_bytes((0, 255, 0)), "image/png")),
        ]
        r = requests.post(
            f"{BASE_URL}/api/admin/upload/images",
            files=files,
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "images" in data and len(data["images"]) == 2
        for img in data["images"]:
            assert img.get("id") and img.get("url") and img.get("thumbnail_url")
            # Check file is publicly accessible
            url = img["url"]
            full = url if url.startswith("http") else f"{BASE_URL}{url}"
            rr = requests.get(full, timeout=30)
            assert rr.status_code == 200, f"Image URL not accessible: {full} -> {rr.status_code}"

    def test_upload_pdf(self, auth_headers):
        files = {"file": ("test.pdf", _pdf_bytes(), "application/pdf")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload/pdf",
            files=files,
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("url")
        url = data["url"]
        full = url if url.startswith("http") else f"{BASE_URL}{url}"
        rr = requests.get(full, timeout=30)
        assert rr.status_code == 200, f"PDF not accessible: {rr.status_code}"

    def test_upload_pdf_rejects_non_pdf(self, auth_headers):
        files = {"file": ("not.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload/pdf",
            files=files,
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=30,
        )
        assert r.status_code in (400, 415, 422), f"Should reject non-PDF, got {r.status_code}"

    def test_upload_logo_updates_settings(self, api_client, auth_headers):
        files = {"file": ("logo.png", _png_bytes((10, 20, 30), size=(200, 200)), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload/logo",
            files=files,
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("url")
        # Verify settings updated
        s = api_client.get(f"{BASE_URL}/api/settings").json()
        assert s.get("logo_url") == data["url"]


# ---------- CSV import ----------
class TestCSV:
    def test_csv_template(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/products/csv-template", headers=auth_headers)
        assert r.status_code == 200
        content = r.content.decode("utf-8-sig")
        assert "reference" in content.lower()
        assert "name" in content.lower() or "nom" in content.lower()
        assert "price" in content.lower() or "prix" in content.lower()

    def test_csv_preview_and_confirm(self, api_client, auth_headers):
        ref = f"TEST_CSV_{uuid.uuid4().hex[:6]}"
        csv_data = (
            "reference,name,price,stock,category,vehicle\n"
            f"{ref}1,TEST CSV Product 1,19.99,En stock,carrosserie,Renault Clio 4\n"
            f"{ref}2,TEST CSV Product 2,29.99,Sur commande (24-72h),mecanique,Peugeot 208\n"
            ",Missing reference,9.99,En stock,,\n"  # error row
        ).encode("utf-8")

        files = {"file": ("test.csv", io.BytesIO(csv_data), "text/csv")}
        r = requests.post(
            f"{BASE_URL}/api/admin/products/csv-preview",
            files=files,
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "mapping" in data
        assert data["valid_count"] >= 2
        assert data["error_count"] >= 1
        assert "rows" in data and isinstance(data["rows"], list)
        valid_rows = data["rows"]

        # Confirm import
        r = api_client.post(
            f"{BASE_URL}/api/admin/products/csv-import-confirm",
            json={"rows": valid_rows},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        data2 = r.json()
        assert data2.get("inserted", 0) + data2.get("updated", 0) >= 2

        # Verify products created
        r = api_client.get(f"{BASE_URL}/api/products?search={ref}")
        assert r.status_code == 200
        listed = r.json()
        assert len(listed) >= 2

        # Cleanup
        for p in listed:
            api_client.delete(f"{BASE_URL}/api/products/{p['id']}/permanent", headers=auth_headers)


# ---------- Promotions ----------
class TestPromotions:
    def test_promotions_crud(self, api_client, auth_headers):
        payload = {
            "title": "TEST Promo",
            "subtitle": "10% off TEST",
            "active": True,
            "order": 0,
        }
        r = api_client.post(f"{BASE_URL}/api/admin/promotions", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # Public list returns it
        r = api_client.get(f"{BASE_URL}/api/promotions")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # Admin list
        r = api_client.get(f"{BASE_URL}/api/admin/promotions", headers=auth_headers)
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # Update -> inactive
        r = api_client.put(
            f"{BASE_URL}/api/admin/promotions/{pid}",
            json={"active": False},
            headers=auth_headers,
        )
        assert r.status_code == 200

        # Public list shouldn't return inactive
        r = api_client.get(f"{BASE_URL}/api/promotions")
        assert not any(p["id"] == pid for p in r.json())

        # Delete
        r = api_client.delete(f"{BASE_URL}/api/admin/promotions/{pid}", headers=auth_headers)
        assert r.status_code == 200


# ---------- Quick Links ----------
class TestQuickLinks:
    def test_public_quicklinks(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/quicklinks")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_quicklinks_crud_and_reorder(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE_URL}/api/admin/quicklinks",
            json={"label": "TEST Link", "url": "https://example.com", "link_type": "url"},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        lid1 = r.json()["id"]

        r = api_client.post(
            f"{BASE_URL}/api/admin/quicklinks",
            json={"label": "TEST Link 2", "url": "https://example.com/2", "link_type": "url"},
            headers=auth_headers,
        )
        lid2 = r.json()["id"]

        # Reorder
        r = api_client.post(
            f"{BASE_URL}/api/admin/quicklinks/reorder",
            json={"ids": [lid2, lid1]},
            headers=auth_headers,
        )
        assert r.status_code == 200

        # Update
        r = api_client.put(
            f"{BASE_URL}/api/admin/quicklinks/{lid1}",
            json={"active": False},
            headers=auth_headers,
        )
        assert r.status_code == 200

        # Delete both
        for lid in (lid1, lid2):
            r = api_client.delete(f"{BASE_URL}/api/admin/quicklinks/{lid}", headers=auth_headers)
            assert r.status_code == 200


# ---------- Feature toggles ----------
class TestFeatureToggles:
    def test_public_and_admin_toggles(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/feature-toggles")
        assert r.status_code == 200
        pub = r.json()
        assert isinstance(pub, dict)
        assert "show_logo" in pub  # seeded

        r = api_client.get(f"{BASE_URL}/api/admin/feature-toggles", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert any(it["key"] == "show_logo" for it in items)

    def test_update_toggle(self, api_client, auth_headers):
        # Save original then revert
        original = api_client.get(f"{BASE_URL}/api/feature-toggles").json().get("show_faq", True)
        r = api_client.put(
            f"{BASE_URL}/api/admin/feature-toggles/show_faq",
            json={"enabled": not original},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["enabled"] == (not original)
        # Revert
        api_client.put(
            f"{BASE_URL}/api/admin/feature-toggles/show_faq",
            json={"enabled": original},
            headers=auth_headers,
        )


# ---------- Settings ----------
class TestSettings:
    def test_settings_get_and_update(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        original = r.json()
        assert "contact_email" in original

        new_phone = "0123456789"
        r = api_client.put(
            f"{BASE_URL}/api/admin/settings",
            json={"contact_phone": new_phone},
            headers=auth_headers,
        )
        assert r.status_code == 200
        r = api_client.get(f"{BASE_URL}/api/settings")
        assert r.json()["contact_phone"] == new_phone

        # Revert
        api_client.put(
            f"{BASE_URL}/api/admin/settings",
            json={"contact_phone": original.get("contact_phone", "0232510433")},
            headers=auth_headers,
        )


# ---------- Pro Registrations ----------
class TestProRegistrations:
    def test_create_and_admin_flow(self, api_client, auth_headers):
        payload = {
            "garage_name": "TEST Garage",
            "contact_name": "John",
            "phone": "0606060606",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
        }
        r = api_client.post(f"{BASE_URL}/api/pro-registrations", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert "whatsapp_notification_url" in data
        rid = data["id"]

        # List
        r = api_client.get(f"{BASE_URL}/api/admin/pro-registrations", headers=auth_headers)
        assert r.status_code == 200
        assert any(p["id"] == rid for p in r.json())

        # Update status
        r = api_client.put(
            f"{BASE_URL}/api/admin/pro-registrations/{rid}",
            json={"status": "approved", "admin_notes": "OK"},
            headers=auth_headers,
        )
        assert r.status_code == 200

        # Delete
        r = api_client.delete(
            f"{BASE_URL}/api/admin/pro-registrations/{rid}", headers=auth_headers
        )
        assert r.status_code == 200


# ---------- Forgot/Reset password ----------
class TestPasswordReset:
    def test_forgot_and_reset_password(self, api_client):
        # Request reset
        r = api_client.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "admin@allopieces76.fr"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        token = data.get("reset_token")
        assert token, "Dev mode should return reset_token"

        # Reset to new password
        new_pwd = "admin123_TEMP"
        r = api_client.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": token, "new_password": new_pwd},
        )
        assert r.status_code == 200

        # Login with new
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@allopieces76.fr", "password": new_pwd},
        )
        assert r.status_code == 200

        # Restore original via another reset cycle
        r = api_client.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "admin@allopieces76.fr"},
        )
        token2 = r.json()["reset_token"]
        r = api_client.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": token2, "new_password": "admin123"},
        )
        assert r.status_code == 200

        # Verify
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@allopieces76.fr", "password": "admin123"},
        )
        assert r.status_code == 200

    def test_forgot_unknown_email(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nobody@example.com"},
        )
        assert r.status_code == 200
        # No token leaked
        assert "reset_token" not in r.json()


# ---------- Audit & Analytics ----------
class TestAdminTools:
    def test_audit_log(self, api_client, auth_headers):
        # Trigger an action first
        api_client.put(
            f"{BASE_URL}/api/admin/feature-toggles/show_faq",
            json={"enabled": True},
            headers=auth_headers,
        )
        r = api_client.get(f"{BASE_URL}/api/admin/audit-log", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        assert "action" in items[0]

    def test_analytics(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        # Check some common keys exist
        assert isinstance(data, dict)
        assert len(data.keys()) > 0


# ---------- Seed data verification ----------
class TestSeeds:
    def test_feature_toggles_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/feature-toggles")
        assert r.status_code == 200
        d = r.json()
        for key in ("show_logo", "show_whatsapp", "show_promotions", "show_faq"):
            assert key in d, f"Missing seeded toggle: {key}"

    def test_quicklinks_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/quicklinks")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1, "No quicklinks seeded"

    def test_settings_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        d = r.json()
        assert d.get("contact_email")
        assert d.get("contact_phone")
        assert d.get("contact_whatsapp")
