# """BiteGo API — FastAPI + MongoDB. Backend is authoritative for all business rules."""
# import asyncio
# import logging
# import uuid
# from contextlib import asynccontextmanager
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# import bcrypt
# from bson import ObjectId
# from fastapi import (APIRouter, Depends, FastAPI, File, HTTPException, Query,
#                      UploadFile, status)
# from fastapi.responses import Response
# from pydantic import BaseModel, Field
# from starlette.concurrency import run_in_threadpool
# from starlette.middleware.cors import CORSMiddleware

# import config
# import finance
# import maps
# import storage as objstore
# from common import (ACTIVE_STATUSES, RESTAURANT_ACCEPT_TIMEOUT_MIN, norm_phone,
#                     notify, ser, transition_order)
# from db import client, db, ensure_defaults, ensure_indexes, get_settings, now
# from security import (current_user, decode_token, gen_otp, hash_secret,
#                       issue_session, make_token, oid, require_roles)

# logging.basicConfig(level=logging.INFO,
#                     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
# logger = logging.getLogger("bitego")


# # ---- Pydantic input models ----------------------------------------------------
# class OtpRequest(BaseModel):
#     phone: str
#     role: str = "customer"


# class OtpVerify(BaseModel):
#     phone: str
#     otp: str
#     role: str = "customer"


# class RefreshBody(BaseModel):
#     refresh_token: str


# class AdminLogin(BaseModel):
#     email: str
#     password: str


# class ProfileUpdate(BaseModel):
#     name: Optional[str] = None
#     email: Optional[str] = None


# class AddressBody(BaseModel):
#     label: str = "Home"
#     line: str
#     lat: float
#     lng: float
#     is_default: bool = False


# class LatLng(BaseModel):
#     lat: float
#     lng: float


# class CartItem(BaseModel):
#     food_id: str
#     quantity: int = Field(ge=1, le=50)


# class CreateOrder(BaseModel):
#     restaurant_id: str
#     items: List[CartItem]
#     address_id: str
#     payment_method: str = "COD"
#     client_order_id: str  # idempotency key


# class ReviewBody(BaseModel):
#     restaurant_rating: int = Field(ge=1, le=5)
#     delivery_rating: Optional[int] = Field(default=None, ge=1, le=5)
#     comment: Optional[str] = ""



# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     await ensure_indexes()
#     await ensure_defaults()
#     # Emergent Storage Init বাদ দেওয়া হলো
#     task = asyncio.create_task(timeout_worker())
#     logger.info("BiteGo API started with Cloudinary Storage")
#     yield
#     task.cancel()
#     await maps.aclose()
#     client.close()

# async def timeout_worker():
#     """Server-side 20-min restaurant accept timeout. Works even if apps closed."""
#     while True:
#         try:
#             cutoff = now() - timedelta(minutes=RESTAURANT_ACCEPT_TIMEOUT_MIN)
#             stale = db.orders.find({"status": "PLACED", "created_at": {"$lte": cutoff}})
#             async for o in stale:
#                 await transition_order(o, "CANCELLED", by="system",
#                                        reason="Restaurant did not accept in time")
#                 await notify(o["customer_id"], "Order cancelled",
#                              "Restaurant did not accept your order in time.")
#         except Exception as e:
#             logger.error("timeout_worker: %s", e)
#         await asyncio.sleep(30)


# app = FastAPI(title="BiteGo API", lifespan=lifespan)
# api = APIRouter(prefix="/api")


# @api.get("/")
# async def root():
#     return {"service": "BiteGo API", "status": "ok"}

















# # ============================ AUTH ============================================
# @api.post("/auth/otp/request")
# async def otp_request(body: OtpRequest):
#     phone = norm_phone(body.phone)
#     role = body.role if body.role in config.ROLES else "customer"
#     # rate limit: max 5 requests / 15 min per phone+role
#     key = f"otp:{role}:{phone}"
#     rl = await db.rate_limits.find_one({"_id": key})
#     if rl and rl["expires_at"] > now():
#         if rl.get("count", 0) >= 5:
#             raise HTTPException(429, "Too many requests. Try again later.")
#         await db.rate_limits.update_one({"_id": key}, {"$inc": {"count": 1}})
#     else:
#         await db.rate_limits.replace_one(
#             {"_id": key},
#             {"_id": key, "count": 1, "expires_at": now() + timedelta(minutes=15)},
#             upsert=True)
#     existing = await db.otp_challenges.find_one(
#         {"phone": phone, "role": role, "consumed": False})
#     if existing and existing["resend_at"] > now():
#         wait = int((existing["resend_at"] - now()).total_seconds())
#         raise HTTPException(429, f"Please wait {wait}s before requesting a new code")
#     otp = gen_otp()
#     await db.otp_challenges.update_many(
#         {"phone": phone, "role": role, "consumed": False},
#         {"$set": {"consumed": True}})
#     await db.otp_challenges.insert_one({
#         "phone": phone, "role": role, "otp_hash": hash_secret(otp),
#         "expires_at": now() + timedelta(seconds=config.OTP_TTL_SEC),
#         "resend_at": now() + timedelta(seconds=config.OTP_RESEND_COOLDOWN_SEC),
#         "attempts": 0, "consumed": False, "created_at": now(),
#     })
#     # DEV: return code so tester can see it. Replace with Rainflair SMS in prod.
#     resp = {"message": "OTP sent", "resend_in": config.OTP_RESEND_COOLDOWN_SEC}
#     if config.IS_DEV:
#         resp["dev_otp"] = otp
#     return resp


# @api.post("/auth/otp/verify")
# async def otp_verify(body: OtpVerify):
#     phone = norm_phone(body.phone)
#     role = body.role if body.role in config.ROLES else "customer"
#     ch = await db.otp_challenges.find_one(
#         {"phone": phone, "role": role, "consumed": False})
#     if not ch or ch["expires_at"] <= now() or ch["attempts"] >= config.OTP_MAX_ATTEMPTS:
#         raise HTTPException(401, "Code expired or invalid. Request a new one.")
#     if hash_secret(body.otp) != ch["otp_hash"]:
#         await db.otp_challenges.update_one({"_id": ch["_id"]},
#                                            {"$inc": {"attempts": 1}})
#         raise HTTPException(401, "Incorrect code")
#     await db.otp_challenges.update_one({"_id": ch["_id"]},
#                                        {"$set": {"consumed": True}})
#     user = await db.users.find_one({"phone": phone, "role": role})
#     is_new = False
#     if not user:
#         is_new = True
#         default_status = "active" if role == "customer" else "pending"
#         res = await db.users.insert_one({
#             "phone": phone, "role": role, "name": None, "active": True,
#             "status": default_status, "created_at": now(),
#             "profile_complete": False,
#         })
#         user = await db.users.find_one({"_id": res.inserted_id})
#     tokens = await issue_session(user)
#     return {**tokens, "user": ser(user), "is_new": is_new}


# @api.post("/auth/refresh")
# async def refresh(body: RefreshBody):
#     payload = decode_token(body.refresh_token, "refresh")
#     old = await db.sessions.find_one_and_update(
#         {"refresh_hash": hash_secret(body.refresh_token),
#          "user_id": oid(payload["sub"]), "revoked_at": None,
#          "expires_at": {"$gt": now()}},
#         {"$set": {"revoked_at": now()}}, return_document=False)
#     if not old:
#         raise HTTPException(401, "Session expired")
#     user = await db.users.find_one({"_id": oid(payload["sub"])})
#     if not user or not user.get("active", True):
#         raise HTTPException(401, "Account unavailable")
#     tokens = await issue_session(user)
#     return {**tokens, "user": ser(user)}


# @api.post("/auth/logout")
# async def logout(body: RefreshBody):
#     await db.sessions.update_one({"refresh_hash": hash_secret(body.refresh_token)},
#                                  {"$set": {"revoked_at": now()}})
#     return {"ok": True}


# @api.get("/auth/me")
# async def me(user=Depends(current_user)):
#     return {"user": ser(user)}






# @api.post("/auth/admin/login")
# async def admin_login(body: AdminLogin):
#     user = await db.users.find_one({
#         "email": body.email.lower().strip(),
#         "role": "admin"
#     })

#     if not user:
#         raise HTTPException(401, "Invalid email or password")

#     stored = user.get("password_hash")

#     if not stored:
#         raise HTTPException(401, "Password not set")

#     if isinstance(stored, str):
#         stored = stored.encode("utf-8")

#     if not bcrypt.checkpw(body.password.encode("utf-8"), stored):
#         raise HTTPException(401, "Invalid email or password")

#     tokens = await issue_session(user)
#     return {**tokens, "user": ser(user)}

# # ============================ CUSTOMER: PROFILE ================================
# @api.put("/customers/profile")
# async def update_profile(body: ProfileUpdate, user=Depends(require_roles("customer"))):
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if upd.get("name"):
#         upd["profile_complete"] = True
#     await db.users.update_one({"_id": user["_id"]}, {"$set": upd})
#     return {"user": ser(await db.users.find_one({"_id": user["_id"]}))}


# # ============================ ADDRESSES =======================================
# @api.get("/addresses")
# async def list_addresses(user=Depends(require_roles("customer"))):
#     rows = await db.addresses.find(
#         {"customer_id": user["_id"], "deleted_at": None}).to_list(100)
#     return {"addresses": ser(rows)}


# @api.post("/addresses")
# async def add_address(body: AddressBody, user=Depends(require_roles("customer"))):
#     count = await db.addresses.count_documents(
#         {"customer_id": user["_id"], "deleted_at": None})
#     is_default = body.is_default or count == 0
#     if is_default:
#         await db.addresses.update_many({"customer_id": user["_id"]},
#                                        {"$set": {"is_default": False}})
#     doc = {**body.model_dump(), "is_default": is_default,
#            "customer_id": user["_id"], "deleted_at": None, "created_at": now()}
#     res = await db.addresses.insert_one(doc)
#     return {"address": ser(await db.addresses.find_one({"_id": res.inserted_id}))}


# @api.put("/addresses/{address_id}")
# async def edit_address(address_id: str, body: AddressBody,
#                        user=Depends(require_roles("customer"))):
#     if body.is_default:
#         await db.addresses.update_many({"customer_id": user["_id"]},
#                                        {"$set": {"is_default": False}})
#     await db.addresses.update_one(
#         {"_id": oid(address_id), "customer_id": user["_id"]},
#         {"$set": body.model_dump()})
#     return {"address": ser(await db.addresses.find_one({"_id": oid(address_id)}))}


# @api.delete("/addresses/{address_id}")
# async def delete_address(address_id: str, user=Depends(require_roles("customer"))):
#     await db.addresses.update_one(
#         {"_id": oid(address_id), "customer_id": user["_id"]},
#         {"$set": {"deleted_at": now(), "is_default": False}})
#     return {"ok": True}


# # ============================ SERVICE AREA MATCH ==============================
# @api.post("/service-areas/match")
# async def match_area(body: LatLng):
#     settings = await get_settings()
#     areas = await db.service_areas.find(
#         {"active": True, "deleted_at": None}).to_list(200)
#     matched = None
#     for a in areas:
#         radius = a.get("radius_km") or settings["max_service_radius_km"]
#         d = finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#         if d <= radius:
#             matched = a
#             break
#     return {"available": matched is not None, "area": ser(matched)}


# # ============================ DISCOVERY =======================================
# @api.get("/categories")
# async def categories():
#     rows = await db.categories.find({"active": True}).sort("order", 1).to_list(100)
#     return {"categories": ser(rows)}


# async def _restaurant_public(r, settings, lat=None, lng=None):
#     d = None
#     if lat is not None and r.get("lat") is not None:
#         d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
#     is_open = r.get("is_open", True) and r.get("status") == "approved"
#     out = ser(r)
#     out["distance_km"] = d
#     out["is_open"] = is_open
#     return out


# @api.get("/restaurants")
# async def restaurants(lat: float = Query(...), lng: float = Query(...),
#                       category: Optional[str] = None,
#                       q: Optional[str] = None):
#     settings = await get_settings()
#     max_radius = settings["max_service_radius_km"]
#     priority = settings["priority_radius_km"]
#     query = {"status": "approved", "deleted_at": None}
#     if category:
#         query["categories"] = category
#     if q:
#         query["name"] = {"$regex": q, "$options": "i"}
#     rows = await db.restaurants.find(query).to_list(500)
#     out = []
#     for r in rows:
#         if r.get("lat") is None:
#             continue
#         d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
#         if d <= max_radius:
#             pub = await _restaurant_public(r, settings, lat, lng)
#             pub["priority"] = d <= priority
#             out.append(pub)
#     out.sort(key=lambda x: (not x["priority"], not x["is_open"], x["distance_km"]))
#     return {"restaurants": out, "priority_radius_km": priority,
#             "max_radius_km": max_radius}


# @api.get("/restaurants/{rid}")
# async def restaurant_detail(rid: str, lat: Optional[float] = None,
#                             lng: Optional[float] = None):
#     settings = await get_settings()
#     r = await db.restaurants.find_one({"_id": oid(rid)})
#     if not r or r.get("status") != "approved":
#         raise HTTPException(404, "Restaurant not found")
#     pub = await _restaurant_public(r, settings, lat, lng)
#     foods = await db.foods.find(
#         {"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     pub["menu"] = ser(foods)
#     reviews = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).limit(20).to_list(20)
#     pub["reviews"] = ser(reviews)
#     return {"restaurant": pub}


# @api.get("/foods/{fid}")
# async def food_detail(fid: str):
#     f = await db.foods.find_one({"_id": oid(fid), "deleted_at": None})
#     if not f:
#         raise HTTPException(404, "Item not found")
#     return {"food": ser(f)}


# @api.get("/search")
# async def search(q: str, lat: float, lng: float):
#     settings = await get_settings()
#     max_radius = settings["max_service_radius_km"]
#     rests = await db.restaurants.find(
#         {"status": "approved", "deleted_at": None,
#          "name": {"$regex": q, "$options": "i"}}).to_list(100)
#     r_out = []
#     for r in rests:
#         if r.get("lat") is None:
#             continue
#         d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
#         if d <= max_radius:
#             r_out.append(await _restaurant_public(r, settings, lat, lng))
#     foods = await db.foods.find(
#         {"deleted_at": None, "name": {"$regex": q, "$options": "i"}}
#     ).limit(50).to_list(50)
#     valid_rids = {r["_id"] for r in rests}
#     f_out = [ser(f) for f in foods if f["restaurant_id"] in valid_rids]
#     return {"restaurants": r_out, "foods": f_out}


# # ============================ FAVORITES =======================================
# @api.get("/favorites")
# async def favorites(user=Depends(require_roles("customer"))):
#     favs = await db.favorites.find({"customer_id": user["_id"]}).to_list(200)
#     rids = [f["ref_id"] for f in favs if f["kind"] == "restaurant"]
#     rests = await db.restaurants.find({"_id": {"$in": rids}}).to_list(200)
#     settings = await get_settings()
#     return {"restaurants": [await _restaurant_public(r, settings) for r in rests],
#             "favorite_ids": [str(f["ref_id"]) for f in favs]}


# @api.post("/favorites")
# async def toggle_favorite(kind: str, ref_id: str,
#                           user=Depends(require_roles("customer"))):
#     existing = await db.favorites.find_one(
#         {"customer_id": user["_id"], "kind": kind, "ref_id": oid(ref_id)})
#     if existing:
#         await db.favorites.delete_one({"_id": existing["_id"]})
#         return {"favorited": False}
#     await db.favorites.insert_one(
#         {"customer_id": user["_id"], "kind": kind, "ref_id": oid(ref_id),
#          "created_at": now()})
#     return {"favorited": True}


# # ============================ ORDERS (customer) ===============================
# async def _default_address(user, address_id):
#     return await db.addresses.find_one(
#         {"_id": oid(address_id), "customer_id": user["_id"], "deleted_at": None})


# @api.post("/orders/quote")
# async def quote_order(body: CreateOrder, user=Depends(require_roles("customer"))):
#     """Authoritative bill preview — same math as order creation, nothing saved."""
#     settings = await get_settings()
#     restaurant = await db.restaurants.find_one({"_id": oid(body.restaurant_id)})
#     if not restaurant or restaurant.get("status") != "approved":
#         raise HTTPException(404, "Restaurant not available")
#     address = await _default_address(user, body.address_id)
#     if not address:
#         raise HTTPException(400, "Select a valid delivery address")
#     match = await match_area(LatLng(lat=address["lat"], lng=address["lng"]))
#     if not match["available"]:
#         raise HTTPException(403, "BiteGo is not available at this address")
#     route = await maps.get_route(restaurant["lat"], restaurant["lng"],
#                                  address["lat"], address["lng"])
#     distance = route["distance_km"]
#     serviceable = distance <= settings["max_service_radius_km"]
#     snap_items = []
#     for it in body.items:
#         f = await db.foods.find_one({"_id": oid(it.food_id),
#                                      "restaurant_id": restaurant["_id"],
#                                      "deleted_at": None})
#         if not f:
#             continue
#         snap_items.append({"price": int(f["price"]), "quantity": it.quantity})
#     totals = finance.compute_totals(
#         snap_items, distance, settings,
#         restaurant.get("commission_pct", settings["restaurant_commission_pct"]),
#         restaurant.get("fixed_fee", settings["restaurant_fixed_fee"]))
#     return {"totals": totals, "serviceable": serviceable,
#             "eta_seconds": route.get("duration_seconds"),
#             "is_open": restaurant.get("is_open", True)}


# @api.post("/orders")
# async def create_order(body: CreateOrder, user=Depends(require_roles("customer"))):
#     settings = await get_settings()
#     if not settings.get("ordering_enabled", True):
#         raise HTTPException(403, "Ordering is temporarily disabled")
#     # Idempotency: prevent duplicate submissions
#     dup = await db.orders.find_one({"customer_id": user["_id"],
#                                     "client_order_id": body.client_order_id})
#     if dup:
#         return {"order": ser(dup), "duplicate": True}

#     restaurant = await db.restaurants.find_one({"_id": oid(body.restaurant_id)})
#     if not restaurant or restaurant.get("status") != "approved":
#         raise HTTPException(404, "Restaurant not available")
#     if not restaurant.get("is_open", True):
#         raise HTTPException(409, "Restaurant is currently closed")

#     address = await _default_address(user, body.address_id)
#     if not address:
#         raise HTTPException(400, "Select a valid delivery address")

#     # Service area validation
#     match = await match_area(LatLng(lat=address["lat"], lng=address["lng"]))
#     if not match["available"]:
#         raise HTTPException(403, "BiteGo is not available at this address")

#     route = await maps.get_route(restaurant["lat"], restaurant["lng"],
#                                  address["lat"], address["lng"])
#     distance = route["distance_km"]
#     if distance > settings["max_service_radius_km"]:
#         raise HTTPException(403, "Address is outside the service area")

#     # Validate items & snapshot current prices from DB (never trust client)
#     snap_items = []
#     for it in body.items:
#         f = await db.foods.find_one({"_id": oid(it.food_id),
#                                      "restaurant_id": restaurant["_id"],
#                                      "deleted_at": None})
#         if not f or not f.get("available", True):
#             raise HTTPException(409, "An item is no longer available")
#         snap_items.append({
#             "food_id": f["_id"], "name": f["name"], "price": int(f["price"]),
#             "quantity": it.quantity, "image": f.get("image"),
#         })
#     if not snap_items:
#         raise HTTPException(400, "Cart is empty")

#     totals = finance.compute_totals(
#         snap_items, distance, settings,
#         restaurant.get("commission_pct", settings["restaurant_commission_pct"]),
#         restaurant.get("fixed_fee", settings["restaurant_fixed_fee"]))

#     order = {
#         "customer_id": user["_id"],
#         "customer_name": user.get("name"),
#         "customer_phone": user.get("phone"),
#         "restaurant_id": restaurant["_id"],
#         "restaurant_name": restaurant["name"],
#         "restaurant_lat": restaurant["lat"], "restaurant_lng": restaurant["lng"],
#         "restaurant_address": restaurant.get("address"),
#         "delivery_partner_id": None,
#         "delivery_partner_name": None,
#         "address": {"label": address["label"], "line": address["line"],
#                     "lat": address["lat"], "lng": address["lng"]},
#         "items": snap_items,
#         "payment_method": "COD",
#         "status": "PLACED",
#         "route_polyline": route.get("polyline"),
#         "distance_source": route.get("source"),
#         "eta_seconds": route.get("duration_seconds"),
#         "client_order_id": body.client_order_id,
#         "service_area_id": restaurant.get("service_area_id"),
#         # ---- financial snapshot (settings-versioned, immutable) ----
#         **totals,
#         "settings_snapshot": {
#             "platform_charge": settings["platform_charge"],
#             "delivery_base_first_km": settings["delivery_base_first_km"],
#             "delivery_additional_per_km": settings["delivery_additional_per_km"],
#             "delivery_partner_earning_slabs": settings["delivery_partner_earning_slabs"],
#         },
#         "settlement": {"restaurant_status": "pending", "restaurant_paid": 0,
#                        "partner_status": "pending", "partner_paid": 0},
#         "review_done": False,
#         "timeline": [{"status": "PLACED", "at": now(), "by": "customer",
#                       "reason": None}],
#         "created_at": now(), "updated_at": now(),
#     }
#     res = await db.orders.insert_one(order)
#     saved = await db.orders.find_one({"_id": res.inserted_id})
#     await notify(restaurant["owner_id"], "New order received!",
#                  f"Order for ₹{totals['customer_total']} — accept within 20 min.",
#                  type_="new_order", data={"order_id": str(res.inserted_id)})
#     await notify(user["_id"], "Order placed",
#                  f"Your order at {restaurant['name']} was placed.")
#     return {"order": ser(saved), "duplicate": False}


# @api.get("/orders")
# async def list_orders(kind: str = "all", page: int = 1, limit: int = 20,
#                       user=Depends(require_roles("customer"))):
#     q = {"customer_id": user["_id"]}
#     if kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows), "page": page}


# @api.get("/orders/{order_id}")
# async def get_order(order_id: str, user=Depends(current_user)):
#     o = await db.orders.find_one({"_id": oid(order_id)})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     if user["role"] == "customer" and o["customer_id"] != user["_id"]:
#         raise HTTPException(403, "Access denied")
#     return {"order": ser(o)}


# @api.post("/orders/{order_id}/cancel")
# async def cancel_order(order_id: str, user=Depends(require_roles("customer"))):
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "customer_id": user["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     if o["status"] not in ["PLACED", "ACCEPTED"]:
#         raise HTTPException(409, "Order can no longer be cancelled")
#     updated = await transition_order(o, "CANCELLED", by="customer",
#                                      reason="Cancelled by customer")
#     return {"order": ser(updated)}


# @api.post("/orders/{order_id}/review")
# async def review_order(order_id: str, body: ReviewBody,
#                        user=Depends(require_roles("customer"))):
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "customer_id": user["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     if o["status"] != "DELIVERED":
#         raise HTTPException(409, "You can review only delivered orders")
#     if o.get("review_done"):
#         raise HTTPException(409, "Order already reviewed")
#     await db.reviews.insert_one({
#         "order_id": o["_id"], "restaurant_id": o["restaurant_id"],
#         "customer_id": user["_id"], "customer_name": user.get("name"),
#         "restaurant_rating": body.restaurant_rating,
#         "delivery_rating": body.delivery_rating,
#         "delivery_partner_id": o.get("delivery_partner_id"),
#         "comment": body.comment, "hidden": False, "created_at": now(),
#     })
#     await db.orders.update_one({"_id": o["_id"]},
#                                {"$set": {"review_done": True}})
#     # recompute restaurant rating
#     agg = await db.reviews.aggregate([
#         {"$match": {"restaurant_id": o["restaurant_id"], "hidden": {"$ne": True}}},
#         {"$group": {"_id": None, "avg": {"$avg": "$restaurant_rating"},
#                     "n": {"$sum": 1}}}]).to_list(1)
#     if agg:
#         await db.restaurants.update_one(
#             {"_id": o["restaurant_id"]},
#             {"$set": {"rating": round(agg[0]["avg"], 1), "rating_count": agg[0]["n"]}})
#     return {"ok": True}


# @api.post("/orders/{order_id}/reorder")
# async def reorder(order_id: str, user=Depends(require_roles("customer"))):
#     """Validate availability & current prices before letting the client re-add."""
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "customer_id": user["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     r = await db.restaurants.find_one({"_id": o["restaurant_id"]})
#     if not r or r.get("status") != "approved":
#         raise HTTPException(409, "Restaurant is no longer available")
#     items = []
#     unavailable = []
#     for it in o["items"]:
#         f = await db.foods.find_one({"_id": it["food_id"], "deleted_at": None})
#         if f and f.get("available", True):
#             items.append({"food_id": str(f["_id"]), "name": f["name"],
#                           "price": int(f["price"]), "quantity": it["quantity"],
#                           "image": f.get("image")})
#         else:
#             unavailable.append(it["name"])
#     return {"restaurant_id": str(r["_id"]), "restaurant_name": r["name"],
#             "is_open": r.get("is_open", True), "items": items,
#             "unavailable": unavailable}


# # ============================ NOTIFICATIONS ===================================
# @api.get("/notifications")
# async def notifications(page: int = 1, limit: int = 30, user=Depends(current_user)):
#     rows = await db.notifications.find({"user_id": user["_id"]}) \
#         .sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
#     unread = await db.notifications.count_documents(
#         {"user_id": user["_id"], "read": False})
#     return {"notifications": ser(rows), "unread": unread}


# @api.post("/notifications/read")
# async def mark_read(user=Depends(current_user)):
#     await db.notifications.update_many({"user_id": user["_id"], "read": False},
#                                        {"$set": {"read": True}})
#     return {"ok": True}


# # ============================ PUBLIC CONTENT ==================================
# @api.get("/content/settings-public")
# async def public_settings():
#     s = await get_settings()
#     return {"helpline": s.get("helpline"), "ordering_enabled": s.get("ordering_enabled")}


# class RouteQuery(BaseModel):
#     o_lat: float
#     o_lng: float
#     d_lat: float
#     d_lng: float


# @api.post("/maps/route")
# async def maps_route(body: RouteQuery, user=Depends(current_user)):
#     """Authoritative road route between two points (distance/eta/encoded polyline).
#     Used by the apps to draw the delivery route on the map."""
#     route = await maps.get_route(body.o_lat, body.o_lng, body.d_lat, body.d_lng)
#     return route

# # ============================ IMAGE UPLOAD / SERVE ============================
# _EXT_BY_CT = {
#     "image/png": "png", "image/webp": "webp", "image/heic": "heic",
#     "image/heif": "heif", "image/jpg": "jpg", "image/jpeg": "jpg"
# }

# @api.post("/upload")
# async def upload_file(file: UploadFile = File(...),
#                       user=Depends(require_roles("restaurant", "admin"))):
#     """
#     Restaurant owners & admins upload images directly to Cloudinary.
#     Returns secure CDN URL.
#     """
#     data = await file.read()
#     if not data:
#         raise HTTPException(400, "Empty file")
#     if len(data) > 8 * 1024 * 1024:
#         raise HTTPException(413, "Image too large (max 8MB)")
    
#     ct = (file.content_type or "image/jpeg").lower()
#     if ct not in _EXT_BY_CT:
#         raise HTTPException(415, "Unsupported image type")

#     try:
#         result = await run_in_threadpool(
#             objstore.upload_file_to_cloudinary, 
#             data, 
#             f"bitego/uploads/{user['_id']}"
#         )
#     except Exception as e:
#         logger.error("Cloudinary upload failed: %s", e)
#         raise HTTPException(502, f"Upload failed: {str(e)}")

#     await db.uploads.insert_one({
#         "owner_id": user["_id"], 
#         "url": result["url"], 
#         "public_id": result["public_id"],
#         "content_type": ct, 
#         "created_at": now()
#     })

#     return {"url": result["url"], "path": result["public_id"]}








# # ============================ MIDDLEWARE & ROUTER INCLUSION ============================

# # ১. সবার আগে CORS Middleware যুক্ত করুন
# app.add_middleware(
#     CORSMiddleware,
#     allow_credentials=True,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ২. মূল API Router টি যুক্ত করুন
# app.include_router(api)

# # ৩. অন্যান্য মডিউলার রাউটারসমূহ
# import routes_ops 
# import routes_admin 

# app.include_router(routes_ops.router)
# app.include_router(routes_admin.router)
























# """BiteGo API — FastAPI + MongoDB. Backend is authoritative for all business rules."""
# import asyncio
# import logging
# import uuid
# from contextlib import asynccontextmanager
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# import bcrypt
# from bson import ObjectId
# from fastapi import (APIRouter, Depends, FastAPI, File, HTTPException, Query,
#                      UploadFile, status)
# from fastapi.responses import Response
# from pydantic import BaseModel, Field
# from starlette.concurrency import run_in_threadpool
# from starlette.middleware.cors import CORSMiddleware

# import config
# import finance
# import maps
# import storage as objstore
# from common import (ACTIVE_STATUSES, RESTAURANT_ACCEPT_TIMEOUT_MIN, norm_phone,
#                     notify, ser, transition_order)
# from db import client, db, ensure_defaults, ensure_indexes, get_settings, now
# from security import (current_user, decode_token, gen_otp, hash_secret,
#                       issue_session, make_token, oid, require_roles)

# logging.basicConfig(level=logging.INFO,
#                     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
# logger = logging.getLogger("bitego")


# # ---- Pydantic input models ----------------------------------------------------
# class OtpRequest(BaseModel):
#     phone: str
#     role: str = "customer"


# class OtpVerify(BaseModel):
#     phone: str
#     otp: str
#     role: str = "customer"


# class RefreshBody(BaseModel):
#     refresh_token: str


# class AdminLogin(BaseModel):
#     email: str
#     password: str


# class ProfileUpdate(BaseModel):
#     name: Optional[str] = None
#     email: Optional[str] = None


# class AddressBody(BaseModel):
#     label: str = "Home"
#     line: str
#     lat: float
#     lng: float
#     is_default: bool = False


# class LatLng(BaseModel):
#     lat: float
#     lng: float


# class CartItem(BaseModel):
#     food_id: str
#     quantity: int = Field(ge=1, le=50)


# class CreateOrder(BaseModel):
#     restaurant_id: str
#     items: List[CartItem]
#     address_id: str
#     payment_method: str = "COD"
#     client_order_id: str  # idempotency key


# class ReviewBody(BaseModel):
#     restaurant_rating: int = Field(ge=1, le=5)
#     delivery_rating: Optional[int] = Field(default=None, ge=1, le=5)
#     comment: Optional[str] = ""



# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     await ensure_indexes()
#     await ensure_defaults()
#     task = asyncio.create_task(timeout_worker())
#     logger.info("BiteGo API started with Cloudinary Storage")
#     yield
#     task.cancel()
#     await maps.aclose()
#     client.close()

# async def timeout_worker():
#     """Server-side 20-min restaurant accept timeout. Works even if apps closed."""
#     while True:
#         try:
#             cutoff = now() - timedelta(minutes=RESTAURANT_ACCEPT_TIMEOUT_MIN)
#             stale = db.orders.find({"status": "PLACED", "created_at": {"$lte": cutoff}})
#             async for o in stale:
#                 await transition_order(o, "CANCELLED", by="system",
#                                        reason="Restaurant did not accept in time")
#                 await notify(o["customer_id"], "Order cancelled",
#                              "Restaurant did not accept your order in time.")
#         except Exception as e:
#             logger.error("timeout_worker: %s", e)
#         await asyncio.sleep(30)


# app = FastAPI(title="BiteGo API", lifespan=lifespan)
# api = APIRouter(prefix="/api")


# @api.get("/")
# async def root():
#     return {"service": "BiteGo API", "status": "ok"}


# # ============================ AUTH ============================================
# @api.post("/auth/otp/request")
# async def otp_request(body: OtpRequest):
#     phone = norm_phone(body.phone)
#     role = body.role if body.role in config.ROLES else "customer"
#     key = f"otp:{role}:{phone}"
#     rl = await db.rate_limits.find_one({"_id": key})
#     if rl and rl["expires_at"] > now():
#         if rl.get("count", 0) >= 5:
#             raise HTTPException(429, "Too many requests. Try again later.")
#         await db.rate_limits.update_one({"_id": key}, {"$inc": {"count": 1}})
#     else:
#         await db.rate_limits.replace_one(
#             {"_id": key},
#             {"_id": key, "count": 1, "expires_at": now() + timedelta(minutes=15)},
#             upsert=True)
#     existing = await db.otp_challenges.find_one(
#         {"phone": phone, "role": role, "consumed": False})
#     if existing and existing["resend_at"] > now():
#         wait = int((existing["resend_at"] - now()).total_seconds())
#         raise HTTPException(429, f"Please wait {wait}s before requesting a new code")
#     otp = gen_otp()
#     await db.otp_challenges.update_many(
#         {"phone": phone, "role": role, "consumed": False},
#         {"$set": {"consumed": True}})
#     await db.otp_challenges.insert_one({
#         "phone": phone, "role": role, "otp_hash": hash_secret(otp),
#         "expires_at": now() + timedelta(seconds=config.OTP_TTL_SEC),
#         "resend_at": now() + timedelta(seconds=config.OTP_RESEND_COOLDOWN_SEC),
#         "attempts": 0, "consumed": False, "created_at": now(),
#     })
#     resp = {"message": "OTP sent", "resend_in": config.OTP_RESEND_COOLDOWN_SEC}
#     if config.IS_DEV:
#         resp["dev_otp"] = otp
#     return resp


# @api.post("/auth/otp/verify")
# async def otp_verify(body: OtpVerify):
#     phone = norm_phone(body.phone)
#     role = body.role if body.role in config.ROLES else "customer"
#     ch = await db.otp_challenges.find_one(
#         {"phone": phone, "role": role, "consumed": False})
#     if not ch or ch["expires_at"] <= now() or ch["attempts"] >= config.OTP_MAX_ATTEMPTS:
#         raise HTTPException(401, "Code expired or invalid. Request a new one.")
#     if hash_secret(body.otp) != ch["otp_hash"]:
#         await db.otp_challenges.update_one({"_id": ch["_id"]},
#                                          {"$inc": {"attempts": 1}})
#         raise HTTPException(401, "Incorrect code")
#     await db.otp_challenges.update_one({"_id": ch["_id"]},
#                                        {"$set": {"consumed": True}})
#     user = await db.users.find_one({"phone": phone, "role": role})
#     is_new = False
#     if not user:
#         is_new = True
#         default_status = "active" if role == "customer" else "pending"
#         res = await db.users.insert_one({
#             "phone": phone, "role": role, "name": None, "active": True,
#             "status": default_status, "created_at": now(),
#             "profile_complete": False,
#         })
#         user = await db.users.find_one({"_id": res.inserted_id})
#     tokens = await issue_session(user)
#     return {**tokens, "user": ser(user), "is_new": is_new}


# @api.post("/auth/refresh")
# async def refresh(body: RefreshBody):
#     payload = decode_token(body.refresh_token, "refresh")
#     old = await db.sessions.find_one_and_update(
#         {"refresh_hash": hash_secret(body.refresh_token),
#          "user_id": oid(payload["sub"]), "revoked_at": None,
#          "expires_at": {"$gt": now()}},
#         {"$set": {"revoked_at": now()}}, return_document=False)
#     if not old:
#         raise HTTPException(401, "Session expired")
#     user = await db.users.find_one({"_id": oid(payload["sub"])})
#     if not user or not user.get("active", True):
#         raise HTTPException(401, "Account unavailable")
#     tokens = await issue_session(user)
#     return {**tokens, "user": ser(user)}


# @api.post("/auth/logout")
# async def logout(body: RefreshBody):
#     await db.sessions.update_one({"refresh_hash": hash_secret(body.refresh_token)},
#                                  {"$set": {"revoked_at": now()}})
#     return {"ok": True}


# @api.get("/auth/me")
# async def me(user=Depends(current_user)):
#     return {"user": ser(user)}


# @api.post("/auth/admin/login")
# async def admin_login(body: AdminLogin):
#     user = await db.users.find_one({
#         "email": body.email.lower().strip(),
#         "role": "admin"
#     })

#     if not user:
#         raise HTTPException(401, "Invalid email or password")

#     stored = user.get("password_hash")

#     if not stored:
#         raise HTTPException(401, "Password not set")

#     if isinstance(stored, str):
#         stored = stored.encode("utf-8")

#     if not bcrypt.checkpw(body.password.encode("utf-8"), stored):
#         raise HTTPException(401, "Invalid email or password")

#     tokens = await issue_session(user)
#     return {**tokens, "user": ser(user)}


# # ============================ CUSTOMER: PROFILE ================================
# @api.put("/customers/profile")
# async def update_profile(body: ProfileUpdate, user=Depends(require_roles("customer"))):
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if upd.get("name"):
#         upd["profile_complete"] = True
#     await db.users.update_one({"_id": user["_id"]}, {"$set": upd})
#     return {"user": ser(await db.users.find_one({"_id": user["_id"]}))}


# # ============================ ADDRESSES =======================================
# @api.get("/addresses")
# async def list_addresses(user=Depends(require_roles("customer"))):
#     rows = await db.addresses.find(
#         {"customer_id": user["_id"], "deleted_at": None}).to_list(100)
#     return {"addresses": ser(rows)}


# @api.post("/addresses")
# async def add_address(body: AddressBody, user=Depends(require_roles("customer"))):
#     count = await db.addresses.count_documents(
#         {"customer_id": user["_id"], "deleted_at": None})
#     is_default = body.is_default or count == 0
#     if is_default:
#         await db.addresses.update_many({"customer_id": user["_id"]},
#                                        {"$set": {"is_default": False}})
#     doc = {**body.model_dump(), "is_default": is_default,
#            "customer_id": user["_id"], "deleted_at": None, "created_at": now()}
#     res = await db.addresses.insert_one(doc)
#     return {"address": ser(await db.addresses.find_one({"_id": res.inserted_id}))}


# @api.put("/addresses/{address_id}")
# async def edit_address(address_id: str, body: AddressBody,
#                        user=Depends(require_roles("customer"))):
#     if body.is_default:
#         await db.addresses.update_many({"customer_id": user["_id"]},
#                                        {"$set": {"is_default": False}})
#     await db.addresses.update_one(
#         {"_id": oid(address_id), "customer_id": user["_id"]},
#         {"$set": body.model_dump()})
#     return {"address": ser(await db.addresses.find_one({"_id": oid(address_id)}))}


# @api.delete("/addresses/{address_id}")
# async def delete_address(address_id: str, user=Depends(require_roles("customer"))):
#     await db.addresses.update_one(
#         {"_id": oid(address_id), "customer_id": user["_id"]},
#         {"$set": {"deleted_at": now(), "is_default": False}})
#     return {"ok": True}


# # ============================ SERVICE AREA MATCH ==============================
# @api.post("/service-areas/match")
# async def match_area(body: LatLng):
#     settings = await get_settings()
#     areas = await db.service_areas.find(
#         {"active": True, "deleted_at": None}).to_list(200)
#     matched = None
#     for a in areas:
#         radius = a.get("radius_km") or settings["max_service_radius_km"]
#         d = finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#         if d <= radius:
#             matched = a
#             break
#     return {"available": matched is not None, "area": ser(matched)}


# # ============================ DISCOVERY =======================================
# @api.get("/categories")
# async def categories():
#     rows = await db.categories.find({"active": True}).sort("order", 1).to_list(100)
#     return {"categories": ser(rows)}


# async def _restaurant_public(r, settings, lat=None, lng=None):
#     d = None
#     if lat is not None and r.get("lat") is not None:
#         d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
#     is_open = r.get("is_open", True) and r.get("status") == "approved"
#     out = ser(r)
#     out["distance_km"] = d
#     out["is_open"] = is_open
#     return out


# @api.get("/restaurants")
# async def restaurants(lat: float = Query(...), lng: float = Query(...),
#                       category: Optional[str] = None,
#                       q: Optional[str] = None):
#     settings = await get_settings()
#     max_radius = settings["max_service_radius_km"]
#     priority = settings["priority_radius_km"]
#     query = {"status": "approved", "deleted_at": None}
#     if category:
#         query["categories"] = category
#     if q:
#         query["name"] = {"$regex": q, "$options": "i"}
#     rows = await db.restaurants.find(query).to_list(500)
#     out = []
#     for r in rows:
#         if r.get("lat") is None:
#             continue
#         d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
#         if d <= max_radius:
#             pub = await _restaurant_public(r, settings, lat, lng)
#             pub["priority"] = d <= priority
#             out.append(pub)
#     out.sort(key=lambda x: (not x["priority"], not x["is_open"], x["distance_km"]))
#     return {"restaurants": out, "priority_radius_km": priority,
#             "max_radius_km": max_radius}


# @api.get("/restaurants/{rid}")
# async def restaurant_detail(rid: str, lat: Optional[float] = None,
#                             lng: Optional[float] = None):
#     settings = await get_settings()
#     r = await db.restaurants.find_one({"_id": oid(rid)})
#     if not r or r.get("status") != "approved":
#         raise HTTPException(404, "Restaurant not found")
#     pub = await _restaurant_public(r, settings, lat, lng)
#     foods = await db.foods.find(
#         {"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     pub["menu"] = ser(foods)
#     reviews = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).limit(20).to_list(20)
#     pub["reviews"] = ser(reviews)
#     return {"restaurant": pub}


# @api.get("/foods/{fid}")
# async def food_detail(fid: str):
#     f = await db.foods.find_one({"_id": oid(fid), "deleted_at": None})
#     if not f:
#         raise HTTPException(404, "Item not found")
#     return {"food": ser(f)}


# @api.get("/search")
# async def search(q: str, lat: float, lng: float):
#     settings = await get_settings()
#     max_radius = settings["max_service_radius_km"]
#     rests = await db.restaurants.find(
#         {"status": "approved", "deleted_at": None,
#          "name": {"$regex": q, "$options": "i"}}).to_list(100)
#     r_out = []
#     for r in rests:
#         if r.get("lat") is None:
#             continue
#         d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
#         if d <= max_radius:
#             r_out.append(await _restaurant_public(r, settings, lat, lng))
#     foods = await db.foods.find(
#         {"deleted_at": None, "name": {"$regex": q, "$options": "i"}}
#     ).limit(50).to_list(50)
#     valid_rids = {r["_id"] for r in rests}
#     f_out = [ser(f) for f in foods if f["restaurant_id"] in valid_rids]
#     return {"restaurants": r_out, "foods": f_out}


# # ============================ FAVORITES =======================================
# @api.get("/favorites")
# async def favorites(user=Depends(require_roles("customer"))):
#     favs = await db.favorites.find({"customer_id": user["_id"]}).to_list(200)
#     rids = [f["ref_id"] for f in favs if f["kind"] == "restaurant"]
#     rests = await db.restaurants.find({"_id": {"$in": rids}}).to_list(200)
#     settings = await get_settings()
#     return {"restaurants": [await _restaurant_public(r, settings) for r in rests],
#             "favorite_ids": [str(f["ref_id"]) for f in favs]}


# @api.post("/favorites")
# async def toggle_favorite(kind: str, ref_id: str,
#                           user=Depends(require_roles("customer"))):
#     existing = await db.favorites.find_one(
#         {"customer_id": user["_id"], "kind": kind, "ref_id": oid(ref_id)})
#     if existing:
#         await db.favorites.delete_one({"_id": existing["_id"]})
#         return {"favorited": False}
#     await db.favorites.insert_one(
#         {"customer_id": user["_id"], "kind": kind, "ref_id": oid(ref_id),
#          "created_at": now()})
#     return {"favorited": True}


# # ============================ ORDERS (customer) ===============================
# async def _default_address(user, address_id):
#     return await db.addresses.find_one(
#         {"_id": oid(address_id), "customer_id": user["_id"], "deleted_at": None})


# @api.post("/orders/quote")
# async def quote_order(body: CreateOrder, user=Depends(require_roles("customer"))):
#     settings = await get_settings()
#     restaurant = await db.restaurants.find_one({"_id": oid(body.restaurant_id)})
#     if not restaurant or restaurant.get("status") != "approved":
#         raise HTTPException(404, "Restaurant not available")
#     address = await _default_address(user, body.address_id)
#     if not address:
#         raise HTTPException(400, "Select a valid delivery address")
#     match = await match_area(LatLng(lat=address["lat"], lng=address["lng"]))
#     if not match["available"]:
#         raise HTTPException(403, "BiteGo is not available at this address")
#     route = await maps.get_route(restaurant["lat"], restaurant["lng"],
#                                  address["lat"], address["lng"])
#     distance = route["distance_km"]
#     serviceable = distance <= settings["max_service_radius_km"]
#     snap_items = []
#     for it in body.items:
#         f = await db.foods.find_one({"_id": oid(it.food_id),
#                                      "restaurant_id": restaurant["_id"],
#                                      "deleted_at": None})
#         if not f:
#             continue
#         snap_items.append({"price": int(f["price"]), "quantity": it.quantity})
#     totals = finance.compute_totals(
#         snap_items, distance, settings,
#         restaurant.get("commission_pct", settings["restaurant_commission_pct"]),
#         restaurant.get("fixed_fee", settings["restaurant_fixed_fee"]))
#     return {"totals": totals, "serviceable": serviceable,
#             "eta_seconds": route.get("duration_seconds"),
#             "is_open": restaurant.get("is_open", True)}


# @api.post("/orders")
# async def create_order(body: CreateOrder, user=Depends(require_roles("customer"))):
#     settings = await get_settings()
#     if not settings.get("ordering_enabled", True):
#         raise HTTPException(403, "Ordering is temporarily disabled")
#     dup = await db.orders.find_one({"customer_id": user["_id"],
#                                     "client_order_id": body.client_order_id})
#     if dup:
#         return {"order": ser(dup), "duplicate": True}

#     restaurant = await db.restaurants.find_one({"_id": oid(body.restaurant_id)})
#     if not restaurant or restaurant.get("status") != "approved":
#         raise HTTPException(404, "Restaurant not available")
#     if not restaurant.get("is_open", True):
#         raise HTTPException(409, "Restaurant is currently closed")

#     address = await _default_address(user, body.address_id)
#     if not address:
#         raise HTTPException(400, "Select a valid delivery address")

#     match = await match_area(LatLng(lat=address["lat"], lng=address["lng"]))
#     if not match["available"]:
#         raise HTTPException(403, "BiteGo is not available at this address")

#     route = await maps.get_route(restaurant["lat"], restaurant["lng"],
#                                  address["lat"], address["lng"])
#     distance = route["distance_km"]
#     if distance > settings["max_service_radius_km"]:
#         raise HTTPException(403, "Address is outside the service area")

#     snap_items = []
#     for it in body.items:
#         f = await db.foods.find_one({"_id": oid(it.food_id),
#                                      "restaurant_id": restaurant["_id"],
#                                      "deleted_at": None})
#         if not f or not f.get("available", True):
#             raise HTTPException(409, "An item is no longer available")
#         snap_items.append({
#             "food_id": f["_id"], "name": f["name"], "price": int(f["price"]),
#             "quantity": it.quantity, "image": f.get("image"),
#         })
#     if not snap_items:
#         raise HTTPException(400, "Cart is empty")

#     totals = finance.compute_totals(
#         snap_items, distance, settings,
#         restaurant.get("commission_pct", settings["restaurant_commission_pct"]),
#         restaurant.get("fixed_fee", settings["restaurant_fixed_fee"]))

#     order = {
#         "customer_id": user["_id"],
#         "customer_name": user.get("name"),
#         "customer_phone": user.get("phone"),
#         "restaurant_id": restaurant["_id"],
#         "restaurant_name": restaurant["name"],
#         "restaurant_lat": restaurant["lat"], "restaurant_lng": restaurant["lng"],
#         "restaurant_address": restaurant.get("address"),
#         "delivery_partner_id": None,
#         "delivery_partner_name": None,
#         "address": {"label": address["label"], "line": address["line"],
#                     "lat": address["lat"], "lng": address["lng"]},
#         "items": snap_items,
#         "payment_method": "COD",
#         "status": "PLACED",
#         "route_polyline": route.get("polyline"),
#         "distance_source": route.get("source"),
#         "eta_seconds": route.get("duration_seconds"),
#         "client_order_id": body.client_order_id,
#         "service_area_id": restaurant.get("service_area_id"),
#         **totals,
#         "settings_snapshot": {
#             "platform_charge": settings["platform_charge"],
#             "delivery_base_first_km": settings["delivery_base_first_km"],
#             "delivery_additional_per_km": settings["delivery_additional_per_km"],
#             "delivery_partner_earning_slabs": settings["delivery_partner_earning_slabs"],
#         },
#         "settlement": {"restaurant_status": "pending", "restaurant_paid": 0,
#                        "partner_status": "pending", "partner_paid": 0},
#         "review_done": False,
#         "timeline": [{"status": "PLACED", "at": now(), "by": "customer",
#                       "reason": None}],
#         "created_at": now(), "updated_at": now(),
#     }
#     res = await db.orders.insert_one(order)
#     saved = await db.orders.find_one({"_id": res.inserted_id})
#     await notify(restaurant["owner_id"], "New order received!",
#                  f"Order for ₹{totals['customer_total']} — accept within 20 min.",
#                  type_="new_order", data={"order_id": str(res.inserted_id)})
#     await notify(user["_id"], "Order placed",
#                  f"Your order at {restaurant['name']} was placed.")
#     return {"order": ser(saved), "duplicate": False}


# @api.get("/orders")
# async def list_orders(kind: str = "all", page: int = 1, limit: int = 20,
#                       user=Depends(require_roles("customer"))):
#     q = {"customer_id": user["_id"]}
#     if kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows), "page": page}


# @api.get("/orders/{order_id}")
# async def get_order(order_id: str, user=Depends(current_user)):
#     o = await db.orders.find_one({"_id": oid(order_id)})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     if user["role"] == "customer" and o["customer_id"] != user["_id"]:
#         raise HTTPException(403, "Access denied")
#     return {"order": ser(o)}


# @api.post("/orders/{order_id}/cancel")
# async def cancel_order(order_id: str, user=Depends(require_roles("customer"))):
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "customer_id": user["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     if o["status"] not in ["PLACED", "ACCEPTED"]:
#         raise HTTPException(409, "Order can no longer be cancelled")
#     updated = await transition_order(o, "CANCELLED", by="customer",
#                                    reason="Cancelled by customer")
#     return {"order": ser(updated)}


# @api.post("/orders/{order_id}/review")
# async def review_order(order_id: str, body: ReviewBody,
#                        user=Depends(require_roles("customer"))):
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "customer_id": user["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     if o["status"] != "DELIVERED":
#         raise HTTPException(409, "You can review only delivered orders")
#     if o.get("review_done"):
#         raise HTTPException(409, "Order already reviewed")
#     await db.reviews.insert_one({
#         "order_id": o["_id"], "restaurant_id": o["restaurant_id"],
#         "customer_id": user["_id"], "customer_name": user.get("name"),
#         "restaurant_rating": body.restaurant_rating,
#         "delivery_rating": body.delivery_rating,
#         "delivery_partner_id": o.get("delivery_partner_id"),
#         "comment": body.comment, "hidden": False, "created_at": now(),
#     })
#     await db.orders.update_one({"_id": o["_id"]},
#                                {"$set": {"review_done": True}})
#     agg = await db.reviews.aggregate([
#         {"$match": {"restaurant_id": o["restaurant_id"], "hidden": {"$ne": True}}},
#         {"$group": {"_id": None, "avg": {"$avg": "$restaurant_rating"},
#                     "n": {"$sum": 1}}}]).to_list(1)
#     if agg:
#         await db.restaurants.update_one(
#             {"_id": o["restaurant_id"]},
#             {"$set": {"rating": round(agg[0]["avg"], 1), "rating_count": agg[0]["n"]}})
#     return {"ok": True}


# @api.post("/orders/{order_id}/reorder")
# async def reorder(order_id: str, user=Depends(require_roles("customer"))):
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "customer_id": user["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     r = await db.restaurants.find_one({"_id": o["restaurant_id"]})
#     if not r or r.get("status") != "approved":
#         raise HTTPException(409, "Restaurant is no longer available")
#     items = []
#     unavailable = []
#     for it in o["items"]:
#         f = await db.foods.find_one({"_id": it["food_id"], "deleted_at": None})
#         if f and f.get("available", True):
#             items.append({"food_id": str(f["_id"]), "name": f["name"],
#                           "price": int(f["price"]), "quantity": it["quantity"],
#                           "image": f.get("image")})
#         else:
#             unavailable.append(it["name"])
#     return {"restaurant_id": str(r["_id"]), "restaurant_name": r["name"],
#             "is_open": r.get("is_open", True), "items": items,
#             "unavailable": unavailable}


# # ============================ NOTIFICATIONS ===================================
# @api.get("/notifications")
# async def notifications(page: int = 1, limit: int = 30, user=Depends(current_user)):
#     rows = await db.notifications.find({"user_id": user["_id"]}) \
#         .sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
#     unread = await db.notifications.count_documents(
#         {"user_id": user["_id"], "read": False})
#     return {"notifications": ser(rows), "unread": unread}


# @api.post("/notifications/read")
# async def mark_read(user=Depends(current_user)):
#     await db.notifications.update_many({"user_id": user["_id"], "read": False},
#                                        {"$set": {"read": True}})
#     return {"ok": True}


# # ============================ PUBLIC CONTENT ==================================
# @api.get("/content/settings-public")
# async def public_settings():
#     s = await get_settings()
#     return {"helpline": s.get("helpline"), "ordering_enabled": s.get("ordering_enabled")}


# class RouteQuery(BaseModel):
#     o_lat: float
#     o_lng: float
#     d_lat: float
#     d_lng: float


# @api.post("/maps/route")
# async def maps_route(body: RouteQuery, user=Depends(current_user)):
#     route = await maps.get_route(body.o_lat, body.o_lng, body.d_lat, body.d_lng)
#     return route


# # ============================ IMAGE UPLOAD / SERVE ============================
# _EXT_BY_CT = {
#     "image/png": "png", "image/webp": "webp", "image/heic": "heic",
#     "image/heif": "heif", "image/jpg": "jpg", "image/jpeg": "jpg"
# }

# @api.post("/upload")
# async def upload_file(file: UploadFile = File(...),
#                      user=Depends(require_roles("restaurant", "admin"))):
#     data = await file.read()
#     if not data:
#         raise HTTPException(400, "Empty file")
#     if len(data) > 8 * 1024 * 1024:
#         raise HTTPException(413, "Image too large (max 8MB)")
    
#     ct = (file.content_type or "image/jpeg").lower()
#     if ct not in _EXT_BY_CT:
#         raise HTTPException(415, "Unsupported image type")

#     try:
#         result = await run_in_threadpool(
#             objstore.upload_file_to_cloudinary, 
#             data, 
#             f"bitego/uploads/{user['_id']}"
#         )
#     except Exception as e:
#         logger.error("Cloudinary upload failed: %s", e)
#         raise HTTPException(502, f"Upload failed: {str(e)}")

#     await db.uploads.insert_one({
#         "owner_id": user["_id"], 
#         "url": result["url"], 
#         "public_id": result["public_id"],
#         "content_type": ct, 
#         "created_at": now()
#     })

#     return {"url": result["url"], "path": result["public_id"]}


# # ============================ MIDDLEWARE & ROUTER INCLUSION ============================

# app.add_middleware(
#     CORSMiddleware,
#     allow_credentials=True,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(api)

# import routes_admin
# import routes_ops

# app.include_router(routes_ops.router)
# app.include_router(routes_admin.router)





























"""BiteGo API — FastAPI + MongoDB. Backend is authoritative for all business rules."""
import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
from bson import ObjectId
from fastapi import (APIRouter, Depends, FastAPI, File, HTTPException, Query,
                     UploadFile, status)
from fastapi.responses import Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

import config
import finance
import maps
import storage as objstore
from common import (ACTIVE_STATUSES, RESTAURANT_ACCEPT_TIMEOUT_MIN, norm_phone,
                    notify, ser, transition_order)
from db import client, db, ensure_defaults, ensure_indexes, get_settings, now
from security import (current_user, decode_token, gen_otp, hash_secret,
                      issue_session, make_token, oid, require_roles)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("bitego")


# ---- Pydantic input models ----------------------------------------------------
class OtpRequest(BaseModel):
    phone: str
    role: str = "customer"


class OtpVerify(BaseModel):
    phone: str
    otp: str
    role: str = "customer"


class RefreshBody(BaseModel):
    refresh_token: str


class AdminLogin(BaseModel):
    email: str
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class AddressBody(BaseModel):
    label: str = "Home"
    line: str
    lat: float
    lng: float
    is_default: bool = False


class LatLng(BaseModel):
    lat: float
    lng: float


class CartItem(BaseModel):
    food_id: str
    quantity: int = Field(ge=1, le=50)


class CreateOrder(BaseModel):
    restaurant_id: str
    items: List[CartItem]
    address_id: str
    payment_method: str = "COD"
    client_order_id: str  # idempotency key


class ReviewBody(BaseModel):
    restaurant_rating: int = Field(ge=1, le=5)
    delivery_rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = ""



@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await ensure_defaults()
    task = asyncio.create_task(timeout_worker())
    logger.info("BiteGo API started with Cloudinary Storage")
    yield
    task.cancel()
    await maps.aclose()
    client.close()

async def timeout_worker():
    """Server-side 20-min restaurant accept timeout. Works even if apps closed."""
    while True:
        try:
            cutoff = now() - timedelta(minutes=RESTAURANT_ACCEPT_TIMEOUT_MIN)
            stale = db.orders.find({"status": "PLACED", "created_at": {"$lte": cutoff}})
            async for o in stale:
                await transition_order(o, "CANCELLED", by="system",
                                       reason="Restaurant did not accept in time")
                await notify(o["customer_id"], "Order cancelled",
                             "Restaurant did not accept your order in time.")
        except Exception as e:
            logger.error("timeout_worker: %s", e)
        await asyncio.sleep(30)


app = FastAPI(title="BiteGo API", lifespan=lifespan)
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "BiteGo API", "status": "ok"}


# ============================ AUTH ============================================
@api.post("/auth/otp/request")
async def otp_request(body: OtpRequest):
    phone = norm_phone(body.phone)
    role = body.role if body.role in config.ROLES else "customer"
    key = f"otp:{role}:{phone}"
    rl = await db.rate_limits.find_one({"_id": key})
    if rl and rl["expires_at"] > now():
        if rl.get("count", 0) >= 5:
            raise HTTPException(429, "Too many requests. Try again later.")
        await db.rate_limits.update_one({"_id": key}, {"$inc": {"count": 1}})
    else:
        await db.rate_limits.replace_one(
            {"_id": key},
            {"_id": key, "count": 1, "expires_at": now() + timedelta(minutes=15)},
            upsert=True)
    existing = await db.otp_challenges.find_one(
        {"phone": phone, "role": role, "consumed": False})
    if existing and existing["resend_at"] > now():
        wait = int((existing["resend_at"] - now()).total_seconds())
        raise HTTPException(429, f"Please wait {wait}s before requesting a new code")
    otp = gen_otp()
    await db.otp_challenges.update_many(
        {"phone": phone, "role": role, "consumed": False},
        {"$set": {"consumed": True}})
    await db.otp_challenges.insert_one({
        "phone": phone, "role": role, "otp_hash": hash_secret(otp),
        "expires_at": now() + timedelta(seconds=config.OTP_TTL_SEC),
        "resend_at": now() + timedelta(seconds=config.OTP_RESEND_COOLDOWN_SEC),
        "attempts": 0, "consumed": False, "created_at": now(),
    })
    resp = {"message": "OTP sent", "resend_in": config.OTP_RESEND_COOLDOWN_SEC}
    if config.IS_DEV:
        resp["dev_otp"] = otp
    return resp


@api.post("/auth/otp/verify")
async def otp_verify(body: OtpVerify):
    phone = norm_phone(body.phone)
    role = body.role if body.role in config.ROLES else "customer"
    ch = await db.otp_challenges.find_one(
        {"phone": phone, "role": role, "consumed": False})
    if not ch or ch["expires_at"] <= now() or ch["attempts"] >= config.OTP_MAX_ATTEMPTS:
        raise HTTPException(401, "Code expired or invalid. Request a new one.")
    if hash_secret(body.otp) != ch["otp_hash"]:
        await db.otp_challenges.update_one({"_id": ch["_id"]},
                                         {"$inc": {"attempts": 1}})
        raise HTTPException(401, "Incorrect code")
    await db.otp_challenges.update_one({"_id": ch["_id"]},
                                       {"$set": {"consumed": True}})
    user = await db.users.find_one({"phone": phone, "role": role})
    is_new = False
    if not user:
        is_new = True
        default_status = "active" if role == "customer" else "pending"
        res = await db.users.insert_one({
            "phone": phone, "role": role, "name": None, "active": True,
            "status": default_status, "created_at": now(),
            "profile_complete": False,
        })
        user = await db.users.find_one({"_id": res.inserted_id})
    tokens = await issue_session(user)
    return {**tokens, "user": ser(user), "is_new": is_new}


@api.post("/auth/refresh")
async def refresh(body: RefreshBody):
    payload = decode_token(body.refresh_token, "refresh")
    old = await db.sessions.find_one_and_update(
        {"refresh_hash": hash_secret(body.refresh_token),
         "user_id": oid(payload["sub"]), "revoked_at": None,
         "expires_at": {"$gt": now()}},
        {"$set": {"revoked_at": now()}}, return_document=False)
    if not old:
        raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"_id": oid(payload["sub"])})
    if not user or not user.get("active", True):
        raise HTTPException(401, "Account unavailable")
    tokens = await issue_session(user)
    return {**tokens, "user": ser(user)}


@api.post("/auth/logout")
async def logout(body: RefreshBody):
    await db.sessions.update_one({"refresh_hash": hash_secret(body.refresh_token)},
                                 {"$set": {"revoked_at": now()}})
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return {"user": ser(user)}


@api.post("/auth/admin/login")
async def admin_login(body: AdminLogin):
    user = await db.users.find_one({
        "email": body.email.lower().strip(),
        "role": "admin"
    })

    if not user:
        raise HTTPException(401, "Invalid email or password")

    stored = user.get("password_hash")

    if not stored:
        raise HTTPException(401, "Password not set")

    if isinstance(stored, str):
        stored = stored.encode("utf-8")

    if not bcrypt.checkpw(body.password.encode("utf-8"), stored):
        raise HTTPException(401, "Invalid email or password")

    tokens = await issue_session(user)
    return {**tokens, "user": ser(user)}


# ============================ CUSTOMER: PROFILE ================================
@api.put("/customers/profile")
async def update_profile(body: ProfileUpdate, user=Depends(require_roles("customer"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd.get("name"):
        upd["profile_complete"] = True
    await db.users.update_one({"_id": user["_id"]}, {"$set": upd})
    return {"user": ser(await db.users.find_one({"_id": user["_id"]}))}


# ============================ ADDRESSES =======================================
@api.get("/addresses")
async def list_addresses(user=Depends(require_roles("customer"))):
    rows = await db.addresses.find(
        {"customer_id": user["_id"], "deleted_at": None}).to_list(100)
    return {"addresses": ser(rows)}


@api.post("/addresses")
async def add_address(body: AddressBody, user=Depends(require_roles("customer"))):
    count = await db.addresses.count_documents(
        {"customer_id": user["_id"], "deleted_at": None})
    is_default = body.is_default or count == 0
    if is_default:
        await db.addresses.update_many({"customer_id": user["_id"]},
                                       {"$set": {"is_default": False}})
    doc = {**body.model_dump(), "is_default": is_default,
           "customer_id": user["_id"], "deleted_at": None, "created_at": now()}
    res = await db.addresses.insert_one(doc)
    return {"address": ser(await db.addresses.find_one({"_id": res.inserted_id}))}


@api.put("/addresses/{address_id}")
async def edit_address(address_id: str, body: AddressBody,
                       user=Depends(require_roles("customer"))):
    if body.is_default:
        await db.addresses.update_many({"customer_id": user["_id"]},
                                       {"$set": {"is_default": False}})
    await db.addresses.update_one(
        {"_id": oid(address_id), "customer_id": user["_id"]},
        {"$set": body.model_dump()})
    return {"address": ser(await db.addresses.find_one({"_id": oid(address_id)}))}


@api.delete("/addresses/{address_id}")
async def delete_address(address_id: str, user=Depends(require_roles("customer"))):
    await db.addresses.update_one(
        {"_id": oid(address_id), "customer_id": user["_id"]},
        {"$set": {"deleted_at": now(), "is_default": False}})
    return {"ok": True}


# ============================ SERVICE AREA MATCH ==============================
@api.post("/service-areas/match")
async def match_area(body: LatLng):
    settings = await get_settings()
    areas = await db.service_areas.find(
        {"active": True, "deleted_at": None}).to_list(200)
    matched = None
    for a in areas:
        radius = a.get("radius_km") or settings["max_service_radius_km"]
        d = finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
        if d <= radius:
            matched = a
            break
    return {"available": matched is not None, "area": ser(matched)}


# ============================ DISCOVERY =======================================
@api.get("/categories")
async def categories():
    rows = await db.categories.find({"active": True}).sort("order", 1).to_list(100)
    return {"categories": ser(rows)}


async def _restaurant_public(r, settings, lat=None, lng=None):
    d = None
    if lat is not None and r.get("lat") is not None:
        d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
    is_open = r.get("is_open", True) and r.get("status") == "approved"
    out = ser(r)
    out["distance_km"] = d
    out["is_open"] = is_open
    return out


@api.get("/restaurants")
async def restaurants(lat: float = Query(...), lng: float = Query(...),
                      category: Optional[str] = None,
                      q: Optional[str] = None):
    settings = await get_settings()
    max_radius = settings["max_service_radius_km"]
    priority = settings["priority_radius_km"]
    query = {"status": "approved", "deleted_at": None}
    if category:
        query["categories"] = category
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    rows = await db.restaurants.find(query).to_list(500)
    out = []
    for r in rows:
        if r.get("lat") is None:
            continue
        d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
        if d <= max_radius:
            pub = await _restaurant_public(r, settings, lat, lng)
            pub["priority"] = d <= priority
            out.append(pub)
    out.sort(key=lambda x: (not x["priority"], not x["is_open"], x["distance_km"]))
    return {"restaurants": out, "priority_radius_km": priority,
            "max_radius_km": max_radius}


@api.get("/restaurants/{rid}")
async def restaurant_detail(rid: str, lat: Optional[float] = None,
                            lng: Optional[float] = None):
    settings = await get_settings()
    r = await db.restaurants.find_one({"_id": oid(rid)})
    if not r or r.get("status") != "approved":
        raise HTTPException(404, "Restaurant not found")
    pub = await _restaurant_public(r, settings, lat, lng)
    foods = await db.foods.find(
        {"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
    pub["menu"] = ser(foods)
    reviews = await db.reviews.find(
        {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
    ).sort("created_at", -1).limit(20).to_list(20)
    pub["reviews"] = ser(reviews)
    return {"restaurant": pub}


# 🛠️ Newly added fallback route to prevent 400 Bad Request
@api.get("/restaurants/menu-edit")
async def restaurant_menu_edit_fallback(
    lat: Optional[float] = None, 
    lng: Optional[float] = None, 
    user=Depends(require_roles("restaurant", "admin"))
):
    r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
    if not r:
        return {"foods": []}
    rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
    return {"foods": ser(rows)}


@api.get("/foods/{fid}")
async def food_detail(fid: str):
    f = await db.foods.find_one({"_id": oid(fid), "deleted_at": None})
    if not f:
        raise HTTPException(404, "Item not found")
    return {"food": ser(f)}


@api.get("/search")
async def search(q: str, lat: float, lng: float):
    settings = await get_settings()
    max_radius = settings["max_service_radius_km"]
    rests = await db.restaurants.find(
        {"status": "approved", "deleted_at": None,
         "name": {"$regex": q, "$options": "i"}}).to_list(100)
    r_out = []
    for r in rests:
        if r.get("lat") is None:
            continue
        d = finance.haversine_km(lat, lng, r["lat"], r["lng"])
        if d <= max_radius:
            r_out.append(await _restaurant_public(r, settings, lat, lng))
    foods = await db.foods.find(
        {"deleted_at": None, "name": {"$regex": q, "$options": "i"}}
    ).limit(50).to_list(50)
    valid_rids = {r["_id"] for r in rests}
    f_out = [ser(f) for f in foods if f["restaurant_id"] in valid_rids]
    return {"restaurants": r_out, "foods": f_out}


# ============================ FAVORITES =======================================
@api.get("/favorites")
async def favorites(user=Depends(require_roles("customer"))):
    favs = await db.favorites.find({"customer_id": user["_id"]}).to_list(200)
    rids = [f["ref_id"] for f in favs if f["kind"] == "restaurant"]
    rests = await db.restaurants.find({"_id": {"$in": rids}}).to_list(200)
    settings = await get_settings()
    return {"restaurants": [await _restaurant_public(r, settings) for r in rests],
            "favorite_ids": [str(f["ref_id"]) for f in favs]}


@api.post("/favorites")
async def toggle_favorite(kind: str, ref_id: str,
                          user=Depends(require_roles("customer"))):
    existing = await db.favorites.find_one(
        {"customer_id": user["_id"], "kind": kind, "ref_id": oid(ref_id)})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    await db.favorites.insert_one(
        {"customer_id": user["_id"], "kind": kind, "ref_id": oid(ref_id),
         "created_at": now()})
    return {"favorited": True}


# ============================ ORDERS (customer) ===============================
async def _default_address(user, address_id):
    return await db.addresses.find_one(
        {"_id": oid(address_id), "customer_id": user["_id"], "deleted_at": None})


@api.post("/orders/quote")
async def quote_order(body: CreateOrder, user=Depends(require_roles("customer"))):
    settings = await get_settings()
    restaurant = await db.restaurants.find_one({"_id": oid(body.restaurant_id)})
    if not restaurant or restaurant.get("status") != "approved":
        raise HTTPException(404, "Restaurant not available")
    address = await _default_address(user, body.address_id)
    if not address:
        raise HTTPException(400, "Select a valid delivery address")
    match = await match_area(LatLng(lat=address["lat"], lng=address["lng"]))
    if not match["available"]:
        raise HTTPException(403, "BiteGo is not available at this address")
    route = await maps.get_route(restaurant["lat"], restaurant["lng"],
                                 address["lat"], address["lng"])
    distance = route["distance_km"]
    serviceable = distance <= settings["max_service_radius_km"]
    snap_items = []
    for it in body.items:
        f = await db.foods.find_one({"_id": oid(it.food_id),
                                     "restaurant_id": restaurant["_id"],
                                     "deleted_at": None})
        if not f:
            continue
        snap_items.append({"price": int(f["price"]), "quantity": it.quantity})
    totals = finance.compute_totals(
        snap_items, distance, settings,
        restaurant.get("commission_pct", settings["restaurant_commission_pct"]),
        restaurant.get("fixed_fee", settings["restaurant_fixed_fee"]))
    return {"totals": totals, "serviceable": serviceable,
            "eta_seconds": route.get("duration_seconds"),
            "is_open": restaurant.get("is_open", True)}


@api.post("/orders")
async def create_order(body: CreateOrder, user=Depends(require_roles("customer"))):
    settings = await get_settings()
    if not settings.get("ordering_enabled", True):
        raise HTTPException(403, "Ordering is temporarily disabled")
    dup = await db.orders.find_one({"customer_id": user["_id"],
                                    "client_order_id": body.client_order_id})
    if dup:
        return {"order": ser(dup), "duplicate": True}

    restaurant = await db.restaurants.find_one({"_id": oid(body.restaurant_id)})
    if not restaurant or restaurant.get("status") != "approved":
        raise HTTPException(404, "Restaurant not available")
    if not restaurant.get("is_open", True):
        raise HTTPException(409, "Restaurant is currently closed")

    address = await _default_address(user, body.address_id)
    if not address:
        raise HTTPException(400, "Select a valid delivery address")

    match = await match_area(LatLng(lat=address["lat"], lng=address["lng"]))
    if not match["available"]:
        raise HTTPException(403, "BiteGo is not available at this address")

    route = await maps.get_route(restaurant["lat"], restaurant["lng"],
                                 address["lat"], address["lng"])
    distance = route["distance_km"]
    if distance > settings["max_service_radius_km"]:
        raise HTTPException(403, "Address is outside the service area")

    snap_items = []
    for it in body.items:
        f = await db.foods.find_one({"_id": oid(it.food_id),
                                     "restaurant_id": restaurant["_id"],
                                     "deleted_at": None})
        if not f or not f.get("available", True):
            raise HTTPException(409, "An item is no longer available")
        snap_items.append({
            "food_id": f["_id"], "name": f["name"], "price": int(f["price"]),
            "quantity": it.quantity, "image": f.get("image"),
        })
    if not snap_items:
        raise HTTPException(400, "Cart is empty")

    totals = finance.compute_totals(
        snap_items, distance, settings,
        restaurant.get("commission_pct", settings["restaurant_commission_pct"]),
        restaurant.get("fixed_fee", settings["restaurant_fixed_fee"]))

    order = {
        "customer_id": user["_id"],
        "customer_name": user.get("name"),
        "customer_phone": user.get("phone"),
        "restaurant_id": restaurant["_id"],
        "restaurant_name": restaurant["name"],
        "restaurant_lat": restaurant["lat"], "restaurant_lng": restaurant["lng"],
        "restaurant_address": restaurant.get("address"),
        "delivery_partner_id": None,
        "delivery_partner_name": None,
        "address": {"label": address["label"], "line": address["line"],
                    "lat": address["lat"], "lng": address["lng"]},
        "items": snap_items,
        "payment_method": "COD",
        "status": "PLACED",
        "route_polyline": route.get("polyline"),
        "distance_source": route.get("source"),
        "eta_seconds": route.get("duration_seconds"),
        "client_order_id": body.client_order_id,
        "service_area_id": restaurant.get("service_area_id"),
        **totals,
        "settings_snapshot": {
            "platform_charge": settings["platform_charge"],
            "delivery_base_first_km": settings["delivery_base_first_km"],
            "delivery_additional_per_km": settings["delivery_additional_per_km"],
            "delivery_partner_earning_slabs": settings["delivery_partner_earning_slabs"],
        },
        "settlement": {"restaurant_status": "pending", "restaurant_paid": 0,
                       "partner_status": "pending", "partner_paid": 0},
        "review_done": False,
        "timeline": [{"status": "PLACED", "at": now(), "by": "customer",
                      "reason": None}],
        "created_at": now(), "updated_at": now(),
    }
    res = await db.orders.insert_one(order)
    saved = await db.orders.find_one({"_id": res.inserted_id})
    await notify(restaurant["owner_id"], "New order received!",
                 f"Order for ₹{totals['customer_total']} — accept within 20 min.",
                 type_="new_order", data={"order_id": str(res.inserted_id)})
    await notify(user["_id"], "Order placed",
                 f"Your order at {restaurant['name']} was placed.")
    return {"order": ser(saved), "duplicate": False}


@api.get("/orders")
async def list_orders(kind: str = "all", page: int = 1, limit: int = 20,
                      user=Depends(require_roles("customer"))):
    q = {"customer_id": user["_id"]}
    if kind == "active":
        q["status"] = {"$in": ACTIVE_STATUSES}
    elif kind == "completed":
        q["status"] = "DELIVERED"
    elif kind == "cancelled":
        q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
    rows = await db.orders.find(q).sort("created_at", -1) \
        .skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"orders": ser(rows), "page": page}


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(current_user)):
    o = await db.orders.find_one({"_id": oid(order_id)})
    if not o:
        raise HTTPException(404, "Order not found")
    if user["role"] == "customer" and o["customer_id"] != user["_id"]:
        raise HTTPException(403, "Access denied")
    return {"order": ser(o)}


@api.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user=Depends(require_roles("customer"))):
    o = await db.orders.find_one({"_id": oid(order_id),
                                  "customer_id": user["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    if o["status"] not in ["PLACED", "ACCEPTED"]:
        raise HTTPException(409, "Order can no longer be cancelled")
    updated = await transition_order(o, "CANCELLED", by="customer",
                                     reason="Cancelled by customer")
    return {"order": ser(updated)}


@api.post("/orders/{order_id}/review")
async def review_order(order_id: str, body: ReviewBody,
                       user=Depends(require_roles("customer"))):
    o = await db.orders.find_one({"_id": oid(order_id),
                                  "customer_id": user["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    if o["status"] != "DELIVERED":
        raise HTTPException(409, "You can review only delivered orders")
    if o.get("review_done"):
        raise HTTPException(409, "Order already reviewed")
    await db.reviews.insert_one({
        "order_id": o["_id"], "restaurant_id": o["restaurant_id"],
        "customer_id": user["_id"], "customer_name": user.get("name"),
        "restaurant_rating": body.restaurant_rating,
        "delivery_rating": body.delivery_rating,
        "delivery_partner_id": o.get("delivery_partner_id"),
        "comment": body.comment, "hidden": False, "created_at": now(),
    })
    await db.orders.update_one({"_id": o["_id"]},
                               {"$set": {"review_done": True}})
    agg = await db.reviews.aggregate([
        {"$match": {"restaurant_id": o["restaurant_id"], "hidden": {"$ne": True}}},
        {"$group": {"_id": None, "avg": {"$avg": "$restaurant_rating"},
                    "n": {"$sum": 1}}}]).to_list(1)
    if agg:
        await db.restaurants.update_one(
            {"_id": o["restaurant_id"]},
            {"$set": {"rating": round(agg[0]["avg"], 1), "rating_count": agg[0]["n"]}})
    return {"ok": True}


@api.post("/orders/{order_id}/reorder")
async def reorder(order_id: str, user=Depends(require_roles("customer"))):
    o = await db.orders.find_one({"_id": oid(order_id),
                                  "customer_id": user["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    r = await db.restaurants.find_one({"_id": o["restaurant_id"]})
    if not r or r.get("status") != "approved":
        raise HTTPException(409, "Restaurant is no longer available")
    items = []
    unavailable = []
    for it in o["items"]:
        f = await db.foods.find_one({"_id": it["food_id"], "deleted_at": None})
        if f and f.get("available", True):
            items.append({"food_id": str(f["_id"]), "name": f["name"],
                          "price": int(f["price"]), "quantity": it["quantity"],
                          "image": f.get("image")})
        else:
            unavailable.append(it["name"])
    return {"restaurant_id": str(r["_id"]), "restaurant_name": r["name"],
            "is_open": r.get("is_open", True), "items": items,
            "unavailable": unavailable}


# ============================ NOTIFICATIONS ===================================
@api.get("/notifications")
async def notifications(page: int = 1, limit: int = 30, user=Depends(current_user)):
    rows = await db.notifications.find({"user_id": user["_id"]}) \
        .sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents(
        {"user_id": user["_id"], "read": False})
    return {"notifications": ser(rows), "unread": unread}


@api.post("/notifications/read")
async def mark_read(user=Depends(current_user)):
    await db.notifications.update_many({"user_id": user["_id"], "read": False},
                                       {"$set": {"read": True}})
    return {"ok": True}


# ============================ PUBLIC CONTENT ==================================
@api.get("/content/settings-public")
async def public_settings():
    s = await get_settings()
    return {"helpline": s.get("helpline"), "ordering_enabled": s.get("ordering_enabled")}


class RouteQuery(BaseModel):
    o_lat: float
    o_lng: float
    d_lat: float
    d_lng: float


@api.post("/maps/route")
async def maps_route(body: RouteQuery, user=Depends(current_user)):
    route = await maps.get_route(body.o_lat, body.o_lng, body.d_lat, body.d_lng)
    return route


# ============================ IMAGE UPLOAD / SERVE ============================
_EXT_BY_CT = {
    "image/png": "png", "image/webp": "webp", "image/heic": "heic",
    "image/heif": "heif", "image/jpg": "jpg", "image/jpeg": "jpg"
}

@api.post("/upload")
async def upload_file(file: UploadFile = File(...),
                     user=Depends(require_roles("restaurant", "admin"))):
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 8MB)")
    
    ct = (file.content_type or "image/jpeg").lower()
    if ct not in _EXT_BY_CT:
        raise HTTPException(415, "Unsupported image type")

    try:
        result = await run_in_threadpool(
            objstore.upload_file_to_cloudinary, 
            data, 
            f"bitego/uploads/{user['_id']}"
        )
    except Exception as e:
        logger.error("Cloudinary upload failed: %s", e)
        raise HTTPException(502, f"Upload failed: {str(e)}")

    await db.uploads.insert_one({
        "owner_id": user["_id"], 
        "url": result["url"], 
        "public_id": result["public_id"],
        "content_type": ct, 
        "created_at": now()
    })

    return {"url": result["url"], "path": result["public_id"]}


# ============================ MIDDLEWARE & ROUTER INCLUSION ============================

# app.add_middleware(
#     CORSMiddleware,
#     allow_credentials=True,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(api)

# import routes_admin
# import routes_ops

# app.include_router(routes_ops.router)
# app.include_router(routes_admin.router)











# ============================ MIDDLEWARE & ROUTER INCLUSION ============================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ১. প্রথমে বেসিক api রাউটারটি ইনক্লুড করো
app.include_router(api)

# ২. অপস এবং এডমিন রাউটারগুলোকে নিরাপদ রাখতে সরাসরি app-এ যুক্ত করার বদলে 
# অথবা তাদের নিজস্ব প্রিফিক্স নিশ্চিত করে এখানে যুক্ত করো:
import routes_admin
import routes_ops

# যদি routes_ops এবং routes_admin এর ভেতরে আলাদা প্রিফিক্স না থাকে, 
# তবে এখানে prefix="/api" দিয়ে ট্যাগ করে দিতে পারো:
app.include_router(routes_ops.router, prefix="/api")
app.include_router(routes_admin.router, prefix="/api")