"""Iteration 4: Image upload, admin media endpoint, logout revocation,
restaurant self-upload flow, and connectivity checks.

Runs after backend_test.py has seeded and set up state, but this file is
self-contained (no reliance on cross-module fixtures).
"""
import io
import os
import struct
import uuid
import time
import zlib

import pytest
import requests

BASE = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE = line.strip().split("=", 1)[1].rstrip("/")
                break
API = BASE + "/api"

ADMIN_EMAIL = "admin@bitego.app"
ADMIN_PW = "BiteGoAdmin@123"
CUST_LAT, CUST_LNG = 22.5726, 88.3639

state = {}


def _tiny_png(color=(255, 0, 0)) -> bytes:
    """Return a minimal valid 1x1 PNG."""
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(
            ">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = b"\x00" + bytes(color)
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def _admin_token():
    if state.get("admin_token"):
        return state["admin_token"]
    r = requests.post(f"{API}/auth/admin/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    tok = r.json()["access_token"]
    state["admin_token"] = tok
    # ensure seed
    requests.post(f"{API}/admin/seed", headers={"Authorization": f"Bearer {tok}"})
    return tok


def _otp_login(phone: str, role: str) -> dict:
    r = requests.post(f"{API}/auth/otp/request", json={"phone": phone, "role": role})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    v = requests.post(f"{API}/auth/otp/verify",
                      json={"phone": phone, "otp": otp, "role": role})
    assert v.status_code == 200, v.text
    return v.json()


def _restaurant_token():
    if state.get("rest_token"):
        return state["rest_token"]
    d = _otp_login("9000000001", "restaurant")
    state["rest_token"] = d["access_token"]
    state["rest_refresh"] = d["refresh_token"]
    state["rest_user_id"] = d["user"]["id"]
    return state["rest_token"]


def _customer_token():
    if state.get("cust_token"):
        return state["cust_token"]
    phone = "9" + str(int(time.time() * 100))[-9:]
    d = _otp_login(phone, "customer")
    state["cust_token"] = d["access_token"]
    state["cust_refresh"] = d["refresh_token"]
    return state["cust_token"]


# ============================ UPLOAD AUTH ==============================
def test_upload_requires_auth():
    """POST /api/upload without a token must be 401."""
    files = {"file": ("t.png", _tiny_png(), "image/png")}
    r = requests.post(f"{API}/upload", files=files)
    assert r.status_code in (401, 403), r.text


def test_upload_customer_forbidden():
    """Customers must NOT be allowed to upload."""
    tok = _customer_token()
    files = {"file": ("t.png", _tiny_png(), "image/png")}
    r = requests.post(f"{API}/upload", files=files,
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403, r.text


def test_upload_rejects_empty_file():
    tok = _admin_token()
    files = {"file": ("empty.png", b"", "image/png")}
    r = requests.post(f"{API}/upload", files=files,
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 400, r.text


def test_upload_rejects_unsupported_content_type():
    tok = _admin_token()
    files = {"file": ("x.txt", b"hello world", "text/plain")}
    r = requests.post(f"{API}/upload", files=files,
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 415, r.text


def test_upload_rejects_over_8mb():
    tok = _admin_token()
    # 8MB + 1 byte of arbitrary content marked as png
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (8 * 1024 * 1024 + 1)
    files = {"file": ("big.png", big, "image/png")}
    r = requests.post(f"{API}/upload", files=files,
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 413, r.text


def test_upload_admin_success_and_serve():
    """Admin uploads; response has {path,url}; GET /api/files/{path} serves bytes."""
    tok = _admin_token()
    png = _tiny_png()
    files = {"file": ("logo.png", png, "image/png")}
    r = requests.post(f"{API}/upload", files=files,
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "path" in body and "url" in body
    assert body["url"].startswith("/api/files/")
    assert body["url"].endswith(body["path"])
    state["admin_upload_path"] = body["path"]
    state["admin_upload_url"] = body["url"]

    # Serve is public (no auth)
    got = requests.get(BASE + body["url"])
    assert got.status_code == 200, got.text
    assert got.headers.get("Content-Type", "").startswith("image/")
    # Bytes must match what we uploaded
    assert got.content == png


def test_upload_restaurant_success():
    """Restaurant owners can upload images too."""
    tok = _restaurant_token()
    files = {"file": ("food.jpg", _tiny_png(), "image/jpeg")}
    r = requests.post(f"{API}/upload", files=files,
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["path"].endswith(".jpg")
    state["rest_upload_path"] = body["path"]
    state["rest_upload_url"] = body["url"]

    got = requests.get(BASE + body["url"])
    assert got.status_code == 200


def test_serve_nonexistent_file_returns_404():
    r = requests.get(f"{API}/files/bitego/uploads/does-not-exist-{uuid.uuid4().hex}.png")
    assert r.status_code == 404


# ==================== ADMIN MEDIA -> CUSTOMER VISIBILITY ================
def test_admin_media_updates_restaurant_and_is_visible_to_customer():
    """PUT /api/admin/restaurants/{rid}/media sets cover; customer discovery
    must reflect the new cover URL for that restaurant."""
    tok = _admin_token()
    aH = {"Authorization": f"Bearer {tok}"}
    # Pick a seeded restaurant
    r = requests.get(f"{API}/restaurants",
                     params={"lat": CUST_LAT, "lng": CUST_LNG})
    assert r.status_code == 200
    rests = r.json()["restaurants"]
    assert len(rests) >= 1
    rid = rests[0]["id"]

    # Reject empty payload
    empty = requests.put(f"{API}/admin/restaurants/{rid}/media",
                         headers=aH, json={})
    assert empty.status_code == 400

    new_cover = state["admin_upload_url"]
    up = requests.put(f"{API}/admin/restaurants/{rid}/media",
                      headers=aH,
                      json={"cover": new_cover, "logo": new_cover,
                            "image": new_cover})
    assert up.status_code == 200, up.text
    assert up.json()["restaurant"]["cover"] == new_cover

    # Customer discovery reflects the new cover
    r2 = requests.get(f"{API}/restaurants",
                      params={"lat": CUST_LAT, "lng": CUST_LNG})
    assert r2.status_code == 200
    match = next((x for x in r2.json()["restaurants"] if x["id"] == rid), None)
    assert match is not None
    assert match.get("cover") == new_cover
    assert match.get("logo") == new_cover
    assert match.get("image") == new_cover

    # Detail endpoint also reflects it
    r3 = requests.get(f"{API}/restaurants/{rid}",
                      params={"lat": CUST_LAT, "lng": CUST_LNG})
    assert r3.status_code == 200
    assert r3.json()["restaurant"]["cover"] == new_cover
    state["seeded_rid"] = rid


# ================ RESTAURANT SELF-UPLOAD -> CUSTOMER FLOW ===============
def test_restaurant_adds_food_with_uploaded_image_visible_to_customer():
    """Seeded restaurant owner: upload an image, POST a new food item with
    that image URL, then verify customer /restaurants/{id} menu returns it."""
    tok = _restaurant_token()
    rH = {"Authorization": f"Bearer {tok}"}

    # Resolve owner's restaurant id
    prof = requests.get(f"{API}/restaurant/me", headers=rH)
    assert prof.status_code == 200, prof.text
    r_obj = prof.json().get("restaurant") or {}
    my_rid = r_obj.get("id")
    assert my_rid, f"restaurant not registered for owner: {prof.text}"

    new_img = state["rest_upload_url"]
    food_name = "TEST_UploadedFood_" + uuid.uuid4().hex[:6]
    add = requests.post(f"{API}/restaurant/foods", headers=rH, json={
        "name": food_name, "description": "test",
        "price": 150, "category": "Pizza",
        "image": new_img, "veg": False, "available": True,
    })
    assert add.status_code == 200, add.text
    fid = add.json()["food"]["id"]
    assert add.json()["food"]["image"] == new_img

    # Customer sees the new food with the uploaded image
    det = requests.get(f"{API}/restaurants/{my_rid}",
                       params={"lat": CUST_LAT, "lng": CUST_LNG})
    assert det.status_code == 200
    match = next((m for m in det.json()["restaurant"]["menu"]
                  if m["id"] == fid), None)
    assert match is not None, "new food not visible in customer menu"
    assert match.get("image") == new_img
    assert match["name"] == food_name

    # Cleanup: soft-delete the test food
    requests.delete(f"{API}/restaurant/foods/{fid}", headers=rH)


# ============================ LOGOUT ====================================
def test_logout_revokes_refresh_token():
    """POST /api/auth/logout: subsequent refresh with same token must 401."""
    d = _otp_login("9" + str(int(time.time() * 1000))[-9:], "customer")
    rtok = d["refresh_token"]
    # sanity: refresh works
    r1 = requests.post(f"{API}/auth/refresh", json={"refresh_token": rtok})
    assert r1.status_code == 200, r1.text
    new_rtok = r1.json()["refresh_token"]
    # logout the new refresh token
    lo = requests.post(f"{API}/auth/logout", json={"refresh_token": new_rtok})
    assert lo.status_code == 200
    assert lo.json().get("ok") is True
    # subsequent refresh must fail
    r2 = requests.post(f"{API}/auth/refresh", json={"refresh_token": new_rtok})
    assert r2.status_code == 401, r2.text


# ============================ CONNECTIVITY ==============================
def test_same_backend_data_visible_across_apps():
    """Data created by admin (media update) must be visible to customer
    (unauthenticated discovery) — confirms all apps share one backend/DB."""
    rid = state.get("seeded_rid")
    if not rid:
        pytest.skip("admin media test did not run")
    new_cover = state["admin_upload_url"]
    r = requests.get(f"{API}/restaurants/{rid}",
                     params={"lat": CUST_LAT, "lng": CUST_LNG})
    assert r.status_code == 200
    assert r.json()["restaurant"]["cover"] == new_cover


# ============================ MAPS / ROUTE (regression) =================
def test_maps_route_source_haversine_regression():
    """Regression: POST /api/maps/route with any auth returns source='haversine'
    because Routes API is disabled on the GCP project."""
    tok = _customer_token()
    H = {"Authorization": f"Bearer {tok}"}
    r = requests.post(f"{API}/maps/route", headers=H,
                      json={"o_lat": CUST_LAT, "o_lng": CUST_LNG,
                            "d_lat": CUST_LAT + 0.01, "d_lng": CUST_LNG})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "haversine"
    assert set(body.keys()) >= {"distance_km", "duration_seconds",
                                "polyline", "source"}
