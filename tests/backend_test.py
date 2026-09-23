"""BiteGo comprehensive backend regression tests (pytest)."""
import os
import uuid
import time

import pytest
import requests

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if "EXPO_PUBLIC_BACKEND_URL" in os.environ else None
# Fall back to what frontend uses via .env — read from the file if env not set
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE = line.strip().split("=", 1)[1]
                break

API = BASE + "/api"
CUST_LAT, CUST_LNG = 22.5726, 88.3639
ADMIN_EMAIL = "admin@bitego.app"
ADMIN_PW = "BiteGoAdmin@123"

state = {}  # shared cross-test state


def _otp_login(phone: str, role: str) -> dict:
    r = requests.post(f"{API}/auth/otp/request", json={"phone": phone, "role": role})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    v = requests.post(f"{API}/auth/otp/verify", json={"phone": phone, "otp": otp, "role": role})
    assert v.status_code == 200, v.text
    return v.json()


# =============================== HEALTH ================================
def test_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# =============================== ADMIN =================================
def test_admin_login_and_seed():
    r = requests.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    tok = r.json()["access_token"]
    state["admin_token"] = tok
    # seed idempotent
    s = requests.post(f"{API}/admin/seed", headers={"Authorization": f"Bearer {tok}"})
    assert s.status_code == 200, s.text
    assert s.json()["ok"] is True
    # second call must still succeed
    s2 = requests.post(f"{API}/admin/seed", headers={"Authorization": f"Bearer {tok}"})
    assert s2.status_code == 200


def test_admin_login_wrong_password():
    r = requests.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


# ============================ AUTH / OTP ===============================
def test_otp_request_returns_dev_otp_and_resend_cooldown():
    phone = "9" + str(int(time.time()))[-9:]
    r = requests.post(f"{API}/auth/otp/request", json={"phone": phone, "role": "customer"})
    assert r.status_code == 200
    assert "dev_otp" in r.json()
    # resend immediately should be blocked (429)
    r2 = requests.post(f"{API}/auth/otp/request", json={"phone": phone, "role": "customer"})
    assert r2.status_code == 429

def test_otp_request_repeat_after_verify_no_500_regression():
    """REGRESSION: repeated /auth/otp/request for the same phone+role must not 500
    (previous DuplicateKeyError bug). After verify consumes an OTP, requesting
    a new one for the same phone+role must succeed. Also verify across all 3
    mobile roles."""
    for role in ("customer", "restaurant", "delivery"):
        phone = "9" + str(int(time.time() * 1000))[-9:]
        for _ in range(3):
            r = requests.post(f"{API}/auth/otp/request",
                              json={"phone": phone, "role": role})
            assert r.status_code == 200, \
                f"role={role} status={r.status_code} body={r.text}"
            otp = r.json()["dev_otp"]
            v = requests.post(f"{API}/auth/otp/verify",
                              json={"phone": phone, "otp": otp, "role": role})
            assert v.status_code == 200, v.text
            assert v.json()["user"]["role"] == role





def test_otp_verify_customer_creates_user_and_returns_tokens():
    phone = "9" + str(int(time.time() * 10))[-9:]
    data = _otp_login(phone, "customer")
    assert "access_token" in data and "refresh_token" in data
    assert data["user"]["role"] == "customer"
    state["customer_token"] = data["access_token"]
    state["customer_refresh"] = data["refresh_token"]


def test_auth_me_and_refresh_rotation():
    tok = state["customer_token"]
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    assert me.json()["user"]["role"] == "customer"

    rr = requests.post(f"{API}/auth/refresh", json={"refresh_token": state["customer_refresh"]})
    assert rr.status_code == 200
    new_refresh = rr.json()["refresh_token"]
    assert new_refresh != state["customer_refresh"]
    # old refresh should now be revoked
    rold = requests.post(f"{API}/auth/refresh", json={"refresh_token": state["customer_refresh"]})
    assert rold.status_code == 401
    state["customer_token"] = rr.json()["access_token"]
    state["customer_refresh"] = new_refresh


def test_role_gate_customer_cannot_hit_admin():
    tok = state["customer_token"]
    r = requests.get(f"{API}/admin/dashboard", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403


# ============================ PROFILE / ADDRESS ========================
def test_profile_update_and_address_crud():
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    p = requests.put(f"{API}/customers/profile", headers=H, json={"name": "TEST User"})
    assert p.status_code == 200
    assert p.json()["user"]["name"] == "TEST User"
    assert p.json()["user"]["profile_complete"] is True

    a = requests.post(f"{API}/addresses", headers=H, json={
        "label": "Home", "line": "TEST Park St", "lat": CUST_LAT, "lng": CUST_LNG,
        "is_default": True})
    assert a.status_code == 200, a.text
    addr = a.json()["address"]
    state["address_id"] = addr["id"]
    assert addr["is_default"] is True

    lst = requests.get(f"{API}/addresses", headers=H)
    assert lst.status_code == 200
    assert any(x["id"] == state["address_id"] for x in lst.json()["addresses"])


def test_service_area_match_inside_and_outside():
    inside = requests.post(f"{API}/service-areas/match", json={"lat": CUST_LAT, "lng": CUST_LNG})
    assert inside.status_code == 200
    assert inside.json()["available"] is True

    outside = requests.post(f"{API}/service-areas/match", json={"lat": 19.0760, "lng": 72.8777})
    assert outside.status_code == 200
    assert outside.json()["available"] is False


# ============================ DISCOVERY ================================
def test_discovery_lists_seeded_restaurants_with_distance_priority():
    r = requests.get(f"{API}/restaurants", params={"lat": CUST_LAT, "lng": CUST_LNG})
    assert r.status_code == 200
    data = r.json()
    rests = data["restaurants"]
    assert len(rests) >= 2
    for x in rests:
        assert "distance_km" in x and x["distance_km"] is not None
        assert "priority" in x
    state["restaurant_id"] = rests[0]["id"]


def test_restaurant_detail_and_menu():
    r = requests.get(f"{API}/restaurants/{state['restaurant_id']}")
    assert r.status_code == 200
    rd = r.json()["restaurant"]
    assert "menu" in rd and len(rd["menu"]) > 0
    state["food_id"] = rd["menu"][0]["id"]
    state["food_price"] = rd["menu"][0]["price"]


def test_categories_and_search():
    c = requests.get(f"{API}/categories")
    assert c.status_code == 200
    assert len(c.json()["categories"]) >= 1
    s = requests.get(f"{API}/search", params={"q": "pizza", "lat": CUST_LAT, "lng": CUST_LNG})
    assert s.status_code == 200


# ============================ FAVORITES ================================
def test_favorites_toggle():
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    r = requests.post(f"{API}/favorites",
                      params={"kind": "restaurant", "ref_id": state["restaurant_id"]},
                      headers=H)
    assert r.status_code == 200 and r.json()["favorited"] is True
    r2 = requests.post(f"{API}/favorites",
                       params={"kind": "restaurant", "ref_id": state["restaurant_id"]},
                       headers=H)
    assert r2.json()["favorited"] is False


# ============================ MONEY MATH (CRITICAL) ====================
def _make_address_at(lat, lng, tok):
    """Create a fresh address to hit ~3km distance from restaurant."""
    a = requests.post(f"{API}/addresses",
                      headers={"Authorization": f"Bearer {tok}"},
                      json={"label": "TEST3km", "line": "3km test", "lat": lat,
                            "lng": lng, "is_default": True})
    assert a.status_code == 200, a.text
    return a.json()["address"]["id"]


def test_quote_and_order_separate_customer_and_partner_money():
    """CRITICAL business rule: at ~3km, customer pays 35 while partner earns 28."""
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    # Get restaurant lat/lng
    r = requests.get(f"{API}/restaurants/{state['restaurant_id']}")
    rd = r.json()["restaurant"]
    # 1 deg latitude ≈ 111 km. Offset 0.02 deg ≈ 2.22 km → falls in (2,3] slab
    # so customer_delivery_charge = 19 + ceil(1.22)*8 = 35
    # and partner_earning slab km=3 → 28. This is the "3 km" bucket per spec.
    lat3 = rd["lat"] + 0.02
    addr_id = _make_address_at(lat3, rd["lng"], tok)
    state["address_3km_id"] = addr_id

    payload = {"restaurant_id": state["restaurant_id"],
               "items": [{"food_id": state["food_id"], "quantity": 1}],
               "address_id": addr_id, "payment_method": "COD",
               "client_order_id": "TEST-" + uuid.uuid4().hex}

    q = requests.post(f"{API}/orders/quote", headers=H, json=payload)
    assert q.status_code == 200, q.text
    t = q.json()["totals"]
    assert 2.0 < t["distance_km"] <= 3.0, t
    assert t["customer_delivery_charge"] == 35, t
    assert t["delivery_partner_earning"] == 28, t
    assert t["customer_delivery_charge"] != t["delivery_partner_earning"]
    assert t["platform_charge"] == 7
    assert t["customer_total"] == state["food_price"] + 7 + 35

    # Now create the order
    payload["client_order_id"] = "TEST-ORD-" + uuid.uuid4().hex
    state["order_client_id"] = payload["client_order_id"]
    o = requests.post(f"{API}/orders", headers=H, json=payload)
    assert o.status_code == 200, o.text
    order = o.json()["order"]
    assert o.json()["duplicate"] is False
    assert order["customer_delivery_charge"] == 35
    assert order["delivery_partner_earning"] == 28
    assert order["bitego_delivery_margin"] == 35 - 28
    assert "settings_snapshot" in order
    assert order["settings_snapshot"]["platform_charge"] == 7
    state["order_id"] = order["id"]


def test_duplicate_order_idempotency():
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    r = requests.get(f"{API}/restaurants/{state['restaurant_id']}")
    rd = r.json()["restaurant"]
    payload = {"restaurant_id": state["restaurant_id"],
               "items": [{"food_id": state["food_id"], "quantity": 1}],
               "address_id": state["address_3km_id"],
               "payment_method": "COD",
               "client_order_id": state["order_client_id"]}
    o = requests.post(f"{API}/orders", headers=H, json=payload)
    assert o.status_code == 200
    assert o.json()["duplicate"] is True
    assert o.json()["order"]["id"] == state["order_id"]


# ============================ ORDER STATE MACHINE ======================
def test_order_state_machine_end_to_end():
    # Restaurant login (role=restaurant)
    rest = _otp_login("9000000001", "restaurant")
    rH = {"Authorization": f"Bearer {rest['access_token']}"}
    oid = state["order_id"]
    a = requests.post(f"{API}/restaurant/orders/{oid}/accept", headers=rH)
    assert a.status_code == 200, a.text
    p = requests.post(f"{API}/restaurant/orders/{oid}/preparing", headers=rH)
    assert p.status_code == 200
    ready = requests.post(f"{API}/restaurant/orders/{oid}/ready", headers=rH)
    assert ready.status_code == 200

    # Invalid transition: cannot go READY -> PREPARING again
    bad = requests.post(f"{API}/restaurant/orders/{oid}/preparing", headers=rH)
    assert bad.status_code == 409

    # Delivery partner login (role=delivery)
    dp = _otp_login("9000000009", "delivery")
    dH = {"Authorization": f"Bearer {dp['access_token']}"}
    # ensure online
    requests.post(f"{API}/delivery/online", headers=dH, json={"online": True})
    req = requests.get(f"{API}/delivery/requests", headers=dH)
    assert req.status_code == 200
    # accept atomically
    ac = requests.post(f"{API}/delivery/orders/{oid}/accept", headers=dH)
    assert ac.status_code == 200, ac.text
    assert ac.json()["your_earning"] == 28  # partner earning, NOT 35
    pk = requests.post(f"{API}/delivery/orders/{oid}/pickup", headers=dH)
    assert pk.status_code == 200
    st = requests.post(f"{API}/delivery/orders/{oid}/start", headers=dH)
    assert st.status_code == 200
    dl = requests.post(f"{API}/delivery/orders/{oid}/deliver", headers=dH)
    assert dl.status_code == 200
    assert dl.json()["order"]["status"] == "DELIVERED"

    # Second accept when already ASSIGNED should be 409
    bad2 = requests.post(f"{API}/delivery/orders/{oid}/accept", headers=dH)
    assert bad2.status_code == 409

    state["delivery_token"] = dp["access_token"]


def test_delivery_earnings_shows_partner_earning_not_customer_charge():
    tok = state["delivery_token"]
    e = requests.get(f"{API}/delivery/earnings",
                     headers={"Authorization": f"Bearer {tok}"})
    assert e.status_code == 200
    assert e.json()["total_earnings"] >= 28
    # confirm none of the history entries carry the customer charge value
    for h in e.json()["history"]:
        assert h["earning"] != 35 or h["earning"] == 28  # sanity


# ============================ REVIEW ===================================
def test_review_after_delivery_and_only_once():
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    r = requests.post(f"{API}/orders/{state['order_id']}/review", headers=H,
                      json={"restaurant_rating": 5, "delivery_rating": 5, "comment": "TEST"})
    assert r.status_code == 200
    # cannot review twice
    r2 = requests.post(f"{API}/orders/{state['order_id']}/review", headers=H,
                       json={"restaurant_rating": 4})
    assert r2.status_code == 409


# ============================ ADMIN SETTINGS ===========================
def test_admin_settings_change_affects_new_quotes_but_not_history():
    aH = {"Authorization": f"Bearer {state['admin_token']}"}
    # historical order stays 7
    o = requests.get(f"{API}/admin/orders/{state['order_id']}", headers=aH)
    assert o.status_code == 200
    old_platform = o.json()["order"]["platform_charge"]
    assert old_platform == 7

    u = requests.put(f"{API}/admin/settings", headers=aH, json={"platform_charge": 9})
    assert u.status_code == 200
    assert u.json()["settings"]["platform_charge"] == 9

    # new quote uses new value
    tok = state["customer_token"]
    payload = {"restaurant_id": state["restaurant_id"],
               "items": [{"food_id": state["food_id"], "quantity": 1}],
               "address_id": state["address_3km_id"],
               "payment_method": "COD",
               "client_order_id": "TEST-Q-" + uuid.uuid4().hex}
    q = requests.post(f"{API}/orders/quote",
                      headers={"Authorization": f"Bearer {tok}"}, json=payload)
    assert q.status_code == 200
    assert q.json()["totals"]["platform_charge"] == 9

    # historical unchanged
    o2 = requests.get(f"{API}/admin/orders/{state['order_id']}", headers=aH)
    assert o2.json()["order"]["platform_charge"] == 7

    # restore
    requests.put(f"{API}/admin/settings", headers=aH, json={"platform_charge": 7})


def test_admin_dashboard_and_settlements():
    aH = {"Authorization": f"Bearer {state['admin_token']}"}
    d = requests.get(f"{API}/admin/dashboard", headers=aH)
    assert d.status_code == 200
    body = d.json()
    for k in ("customers", "restaurants", "orders_total", "today_revenue"):
        assert k in body
    s = requests.get(f"{API}/admin/settlements/today", headers=aH)
    assert s.status_code == 200
    assert "restaurants" in s.json() and "partners" in s.json()


# ============================ GOOGLE MAPS ROUTES ======================
# New endpoint: POST /api/maps/route (auth required). Routes API is DISABLED
# on the provided GCP project so backend must fall back to Haversine.
def test_maps_route_requires_auth():
    """POST /api/maps/route without a bearer token must be 401."""
    r = requests.post(f"{API}/maps/route",
                      json={"o_lat": CUST_LAT, "o_lng": CUST_LNG,
                            "d_lat": CUST_LAT + 0.02, "d_lng": CUST_LNG})
    assert r.status_code == 401, r.text


def test_maps_route_returns_haversine_fallback():
    """Returns {distance_km, duration_seconds, polyline, source}. Because the
    Routes API is disabled on this GCP project, source must be 'haversine' and
    the distance must match the pure Haversine formula between the two points.
    duration_seconds and polyline may be null in the fallback path."""
    import math
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    o_lat, o_lng = CUST_LAT, CUST_LNG
    d_lat, d_lng = CUST_LAT + 0.02, CUST_LNG  # ~2.22 km north
    r = requests.post(f"{API}/maps/route", headers=H,
                      json={"o_lat": o_lat, "o_lng": o_lng,
                            "d_lat": d_lat, "d_lng": d_lng})
    assert r.status_code == 200, r.text
    body = r.json()
    for k in ("distance_km", "duration_seconds", "polyline", "source"):
        assert k in body, f"missing key {k}: {body}"
    assert body["source"] == "haversine", body
    # In the fallback path Google-only fields must be null.
    assert body["polyline"] is None
    assert body["duration_seconds"] is None
    # Cross-check the distance against a local Haversine (tolerance 0.01 km)
    def hv(a1, b1, a2, b2):
        R = 6371.0
        p1, p2 = math.radians(a1), math.radians(a2)
        dp = math.radians(a2 - a1); dl = math.radians(b2 - b1)
        h = (math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2)
        return 2*R*math.atan2(math.sqrt(h), math.sqrt(1-h))
    expected = hv(o_lat, o_lng, d_lat, d_lng)
    assert abs(body["distance_km"] - expected) < 0.01, (body, expected)
    # Should be ~2.22 km for a 0.02 deg latitude offset
    assert 2.0 < body["distance_km"] < 2.5, body


def test_maps_route_zero_distance():
    """Same origin/destination — distance must be 0 (or near-0)."""
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    r = requests.post(f"{API}/maps/route", headers=H,
                      json={"o_lat": CUST_LAT, "o_lng": CUST_LNG,
                            "d_lat": CUST_LAT, "d_lng": CUST_LNG})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "haversine"
    assert body["distance_km"] == 0 or body["distance_km"] < 0.001


def test_quote_response_includes_eta_seconds_field():
    """Quote must include eta_seconds (nullable while Routes API disabled)."""
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    payload = {"restaurant_id": state["restaurant_id"],
               "items": [{"food_id": state["food_id"], "quantity": 1}],
               "address_id": state["address_3km_id"],
               "payment_method": "COD",
               "client_order_id": "TEST-Q-ETA-" + uuid.uuid4().hex}
    q = requests.post(f"{API}/orders/quote", headers=H, json=payload)
    assert q.status_code == 200, q.text
    body = q.json()
    assert "eta_seconds" in body
    # Haversine path returns None for eta
    assert body["eta_seconds"] is None
    # totals still correct
    t = body["totals"]
    assert t["customer_delivery_charge"] == 35
    assert t["delivery_partner_earning"] == 28


def test_created_order_carries_map_metadata_and_coords():
    """Order stored must contain distance_source='haversine', route_polyline
    (nullable), eta_seconds (nullable) plus restaurant/address lat+lng for
    map rendering. Verify via GET /orders/{id}."""
    tok = state["customer_token"]
    H = {"Authorization": f"Bearer {tok}"}
    r = requests.get(f"{API}/orders/{state['order_id']}", headers=H)
    assert r.status_code == 200, r.text
    o = r.json()["order"]
    assert o["distance_source"] == "haversine", o.get("distance_source")
    # nullable in fallback
    assert o["route_polyline"] is None
    assert o["eta_seconds"] is None
    # coordinates needed for map render
    assert isinstance(o.get("restaurant_lat"), (int, float))
    assert isinstance(o.get("restaurant_lng"), (int, float))
    assert isinstance(o["address"]["lat"], (int, float))
    assert isinstance(o["address"]["lng"], (int, float))
    # money snapshot immutable
    assert o["customer_delivery_charge"] == 35
    assert o["delivery_partner_earning"] == 28


def test_delivery_requests_include_partner_earning_and_coords():
    """Regression: /api/delivery/requests must surface `your_earning` (partner
    earning, NOT customer charge) and lat/lng coordinates for map rendering.
    We test the shape via the already-DELIVERED order (won't appear in
    requests), so we instead assert delivery earnings history still carries
    the correct value and shape."""
    tok = state.get("delivery_token")
    if not tok:
        pytest.skip("delivery token unavailable — state-machine test not run yet")
    H = {"Authorization": f"Bearer {tok}"}
    e = requests.get(f"{API}/delivery/earnings", headers=H)
    assert e.status_code == 200
    body = e.json()
    # The delivered order should be there with earning==28 (partner slab)
    found = False
    for h in body["history"]:
        if h.get("id") == state["order_id"]:
            assert h["earning"] == 28
            # order object should still carry map coords
            assert isinstance(h.get("restaurant_lat"), (int, float))
            assert isinstance(h.get("restaurant_lng"), (int, float))
            assert isinstance(h["address"]["lat"], (int, float))
            assert isinstance(h["address"]["lng"], (int, float))
            assert h.get("distance_source") == "haversine"
            found = True
    assert found, "delivered order not found in partner history"
