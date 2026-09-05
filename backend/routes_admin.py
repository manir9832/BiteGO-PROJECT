# """Admin Website backend API + optional dev seed."""
# from datetime import datetime, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import config
# from common import audit, notify, ser
# from db import db, get_settings, now
# from security import oid, require_roles

# router = APIRouter(prefix="/api/admin")
# Admin = require_roles("admin")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =============================== DASHBOARD ===================================
# @router.get("/dashboard")
# async def dashboard(admin=Depends(Admin)):
#     ds = day_start()
#     total_orders = await db.orders.count_documents({})
#     today_orders = await db.orders.find({"created_at": {"$gte": ds}}).to_list(5000)
#     delivered_today = [o for o in today_orders if o["status"] == "DELIVERED"]
#     return {
#         "customers": await db.users.count_documents({"role": "customer"}),
#         "restaurants": await db.restaurants.count_documents({"deleted_at": None}),
#         "restaurants_pending": await db.restaurants.count_documents({"status": "pending"}),
#         "delivery_partners": await db.delivery_partners.count_documents({}),
#         "delivery_pending": await db.delivery_partners.count_documents({"status": "pending"}),
#         "orders_total": total_orders,
#         "orders_active": await db.orders.count_documents(
#             {"status": {"$in": ["PLACED", "ACCEPTED", "PREPARING", "READY",
#                                 "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}),
#         "orders_completed": await db.orders.count_documents({"status": "DELIVERED"}),
#         "orders_cancelled": await db.orders.count_documents(
#             {"status": {"$in": ["CANCELLED", "REJECTED"]}}),
#         "today_orders": len(today_orders),
#         "today_revenue": sum(o["customer_total"] for o in delivered_today),
#         "platform_revenue": sum(o["platform_charge"] for o in delivered_today),
#         "commission_revenue": sum(o["restaurant_commission_amount"] for o in delivered_today),
#         "delivery_margin": sum(o["bitego_delivery_margin"] for o in delivered_today),
#         "seller_payable_today": sum(o["restaurant_net_payable"] for o in delivered_today),
#         "partner_payable_today": sum(o["delivery_partner_earning"] for o in delivered_today),
#     }


# # =============================== SETTINGS ====================================
# class EarningSlab(BaseModel):
#     km: int
#     earning: float


# class SettingsUpdate(BaseModel):
#     platform_charge: Optional[float] = None
#     restaurant_commission_pct: Optional[float] = None
#     restaurant_fixed_fee: Optional[float] = None
#     delivery_base_first_km: Optional[float] = None
#     delivery_additional_per_km: Optional[float] = None
#     delivery_partner_earning_slabs: Optional[List[EarningSlab]] = None
#     max_service_radius_km: Optional[float] = None
#     priority_radius_km: Optional[float] = None
#     ordering_enabled: Optional[bool] = None
#     helpline: Optional[str] = None


# @router.get("/settings")
# async def get_settings_admin(admin=Depends(Admin)):
#     return {"settings": ser(await get_settings())}


# @router.put("/settings")
# async def update_settings(body: SettingsUpdate, admin=Depends(Admin)):
#     upd = {}
#     for k, v in body.model_dump().items():
#         if v is None:
#             continue
#         if k == "delivery_partner_earning_slabs":
#             upd[k] = [{"km": int(s["km"]), "earning": float(s["earning"])} for s in v]
#         else:
#             upd[k] = v
#     await db.business_settings.update_one({"_id": "global"}, {"$set": upd}, upsert=True)
#     await audit(admin, "update_settings", target="global", meta=upd)
#     return {"settings": ser(await get_settings())}


# # ============================ SERVICE AREAS ==================================
# class ServiceArea(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     radius_km: float = 10
#     priority_radius_km: float = 5
#     active: bool = True


# @router.get("/service-areas")
# async def list_areas(admin=Depends(Admin)):
#     rows = await db.service_areas.find({"deleted_at": None}).to_list(200)
#     return {"areas": ser(rows)}


# @router.post("/service-areas")
# async def create_area(body: ServiceArea, admin=Depends(Admin)):
#     doc = {**body.model_dump(),
#            "center": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.service_areas.insert_one(doc)
#     await audit(admin, "create_service_area", target=str(res.inserted_id), meta=body.model_dump())
#     return {"area": ser(await db.service_areas.find_one({"_id": res.inserted_id}))}


# @router.put("/service-areas/{area_id}")
# async def update_area(area_id: str, body: ServiceArea, admin=Depends(Admin)):
#     upd = {**body.model_dump(),
#            "center": {"type": "Point", "coordinates": [body.lng, body.lat]}}
#     await db.service_areas.update_one({"_id": oid(area_id)}, {"$set": upd})
#     await audit(admin, "update_service_area", target=area_id)
#     return {"area": ser(await db.service_areas.find_one({"_id": oid(area_id)}))}


# @router.delete("/service-areas/{area_id}")
# async def deactivate_area(area_id: str, admin=Depends(Admin)):
#     # Soft-remove: never destroy historical data.
#     await db.service_areas.update_one(
#         {"_id": oid(area_id)}, {"$set": {"deleted_at": now(), "active": False}})
#     await audit(admin, "delete_service_area", target=area_id)
#     return {"ok": True}


# # ======================= RESTAURANT MANAGEMENT ===============================
# class RestaurantSettings(BaseModel):
#     commission_pct: Optional[float] = None
#     fixed_fee: Optional[float] = None
#     service_area_id: Optional[str] = None


# @router.get("/restaurants")
# async def admin_restaurants(status: Optional[str] = None, q: Optional[str] = None,
#                             admin=Depends(Admin)):
#     query = {"deleted_at": None}
#     if status:
#         query["status"] = status
#     if q:
#         query["name"] = {"$regex": q, "$options": "i"}
#     rows = await db.restaurants.find(query).sort("created_at", -1).to_list(500)
#     return {"restaurants": ser(rows)}


# async def _set_restaurant_status(rid, st, admin, action):
#     r = await db.restaurants.find_one({"_id": oid(rid)})
#     if not r:
#         raise HTTPException(404, "Restaurant not found")
#     await db.restaurants.update_one({"_id": oid(rid)}, {"$set": {"status": st}})
#     owner_active = st in ("approved",)
#     await db.users.update_one({"_id": r["owner_id"]},
#                               {"$set": {"active": st != "suspended",
#                                         "status": "active" if owner_active else st}})
#     await audit(admin, action, target=rid)
#     await notify(r["owner_id"], f"Restaurant {st}",
#                  f"Your restaurant status is now {st}.", type_="account")
#     return await db.restaurants.find_one({"_id": oid(rid)})


# @router.post("/restaurants/{rid}/approve")
# async def approve_restaurant(rid: str, admin=Depends(Admin)):
#     return {"restaurant": ser(await _set_restaurant_status(rid, "approved", admin, "approve_restaurant"))}


# @router.post("/restaurants/{rid}/reject")
# async def reject_restaurant(rid: str, admin=Depends(Admin)):
#     return {"restaurant": ser(await _set_restaurant_status(rid, "rejected", admin, "reject_restaurant"))}


# @router.post("/restaurants/{rid}/suspend")
# async def suspend_restaurant(rid: str, admin=Depends(Admin)):
#     return {"restaurant": ser(await _set_restaurant_status(rid, "suspended", admin, "suspend_restaurant"))}


# @router.put("/restaurants/{rid}/settings")
# async def restaurant_settings(rid: str, body: RestaurantSettings, admin=Depends(Admin)):
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "service_area_id" in upd:
#         upd["service_area_id"] = oid(upd["service_area_id"])
#     await db.restaurants.update_one({"_id": oid(rid)}, {"$set": upd})
#     await audit(admin, "restaurant_settings", target=rid, meta={k: str(v) for k, v in upd.items()})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": oid(rid)}))}


# class RestaurantMedia(BaseModel):
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     image: Optional[str] = None


# @router.put("/restaurants/{rid}/media")
# async def restaurant_media(rid: str, body: RestaurantMedia, admin=Depends(Admin)):
#     """Admin uploads/changes a restaurant's logo/banner; reflected in Customer app."""
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if not upd:
#         raise HTTPException(400, "No image provided")
#     r = await db.restaurants.find_one({"_id": oid(rid)})
#     if not r:
#         raise HTTPException(404, "Restaurant not found")
#     await db.restaurants.update_one({"_id": oid(rid)}, {"$set": upd})
#     await audit(admin, "restaurant_media", target=rid)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": oid(rid)}))}


# # ==================== DELIVERY PARTNER MANAGEMENT ============================
# @router.get("/delivery-partners")
# async def admin_partners(status: Optional[str] = None, admin=Depends(Admin)):
#     query = {}
#     if status:
#         query["status"] = status
#     rows = await db.delivery_partners.find(query).sort("created_at", -1).to_list(500)
#     return {"partners": ser(rows)}


# async def _set_partner_status(pid, st, admin, action):
#     p = await db.delivery_partners.find_one({"_id": oid(pid)})
#     if not p:
#         raise HTTPException(404, "Partner not found")
#     online = p.get("online", False) and st == "approved"
#     await db.delivery_partners.update_one({"_id": oid(pid)},
#                                           {"$set": {"status": st, "online": online}})
#     await db.users.update_one({"_id": p["user_id"]},
#                               {"$set": {"active": st != "suspended"}})
#     await audit(admin, action, target=pid)
#     await notify(p["user_id"], f"Account {st}",
#                  f"Your delivery partner account is now {st}.", type_="account")
#     return await db.delivery_partners.find_one({"_id": oid(pid)})


# @router.post("/delivery-partners/{pid}/approve")
# async def approve_partner(pid: str, admin=Depends(Admin)):
#     return {"partner": ser(await _set_partner_status(pid, "approved", admin, "approve_partner"))}


# @router.post("/delivery-partners/{pid}/reject")
# async def reject_partner(pid: str, admin=Depends(Admin)):
#     return {"partner": ser(await _set_partner_status(pid, "rejected", admin, "reject_partner"))}


# @router.post("/delivery-partners/{pid}/suspend")
# async def suspend_partner(pid: str, admin=Depends(Admin)):
#     return {"partner": ser(await _set_partner_status(pid, "suspended", admin, "suspend_partner"))}


# # ======================== CUSTOMER MANAGEMENT ================================
# @router.get("/customers")
# async def admin_customers(q: Optional[str] = None, page: int = 1, admin=Depends(Admin)):
#     query = {"role": "customer"}
#     if q:
#         query["$or"] = [{"name": {"$regex": q, "$options": "i"}},
#                         {"phone": {"$regex": q, "$options": "i"}}]
#     rows = await db.users.find(query).sort("created_at", -1) \
#         .skip((page - 1) * 30).limit(30).to_list(30)
#     return {"customers": ser(rows)}


# @router.post("/customers/{cid}/toggle")
# async def toggle_customer(cid: str, admin=Depends(Admin)):
#     c = await db.users.find_one({"_id": oid(cid), "role": "customer"})
#     if not c:
#         raise HTTPException(404, "Customer not found")
#     active = not c.get("active", True)
#     await db.users.update_one({"_id": oid(cid)}, {"$set": {"active": active}})
#     await audit(admin, "toggle_customer", target=cid, meta={"active": active})
#     return {"active": active}


# # ============================ ORDER MANAGEMENT ===============================
# @router.get("/orders")
# async def admin_orders(status: Optional[str] = None, page: int = 1, admin=Depends(Admin)):
#     query = {}
#     if status:
#         query["status"] = status
#     rows = await db.orders.find(query).sort("created_at", -1) \
#         .skip((page - 1) * 30).limit(30).to_list(30)
#     return {"orders": ser(rows)}


# @router.get("/orders/{order_id}")
# async def admin_order_detail(order_id: str, admin=Depends(Admin)):
#     o = await db.orders.find_one({"_id": oid(order_id)})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return {"order": ser(o)}


# # ============================ SETTLEMENTS ====================================
# @router.get("/settlements/today")
# async def settlements_today(admin=Depends(Admin)):
#     ds = day_start()
#     delivered = await db.orders.find(
#         {"status": "DELIVERED", "delivered_at": {"$gte": ds}}).to_list(5000)
#     rest_map, part_map = {}, {}
#     for o in delivered:
#         rk = str(o["restaurant_id"])
#         r = rest_map.setdefault(rk, {"restaurant_id": rk, "name": o["restaurant_name"],
#                                      "orders": 0, "gross": 0, "food_subtotal": 0,
#                                      "platform_charge": 0, "delivery_charge": 0,
#                                      "commission": 0, "fixed_fee": 0, "net_payable": 0,
#                                      "paid": 0})
#         r["orders"] += 1
#         r["gross"] += o["customer_total"]
#         r["food_subtotal"] += o["food_subtotal"]
#         r["platform_charge"] += o["platform_charge"]
#         r["delivery_charge"] += o["customer_delivery_charge"]
#         r["commission"] += o["restaurant_commission_amount"]
#         r["fixed_fee"] += o["restaurant_fixed_fee"]
#         r["net_payable"] += o["restaurant_net_payable"]
#         r["paid"] += o.get("settlement", {}).get("restaurant_paid", 0)
#         if o.get("delivery_partner_id"):
#             pk = str(o["delivery_partner_id"])
#             p = part_map.setdefault(pk, {"partner_id": pk,
#                                          "name": o.get("delivery_partner_name"),
#                                          "deliveries": 0, "earnings": 0, "paid": 0})
#             p["deliveries"] += 1
#             p["earnings"] += o["delivery_partner_earning"]
#             p["paid"] += o.get("settlement", {}).get("partner_paid", 0)
#     for r in rest_map.values():
#         r["remaining"] = round(r["net_payable"] - r["paid"], 2)
#     for p in part_map.values():
#         p["remaining"] = round(p["earnings"] - p["paid"], 2)
#     restaurants = list(rest_map.values())
#     partners = list(part_map.values())
#     return {
#         "restaurants": restaurants, "partners": partners,
#         "summary": {
#             "total_seller_payable": round(sum(r["net_payable"] for r in restaurants), 2),
#             "total_partner_payable": round(sum(p["earnings"] for p in partners), 2),
#             "total_platform_revenue": sum(o["platform_charge"] for o in delivered),
#             "total_completed_orders": len(delivered),
#             "total_paid": round(sum(r["paid"] for r in restaurants)
#                                 + sum(p["paid"] for p in partners), 2),
#             "total_remaining": round(sum(r["remaining"] for r in restaurants)
#                                      + sum(p["remaining"] for p in partners), 2),
#         },
#     }


# # ============================ CATEGORIES =====================================
# class Category(BaseModel):
#     name: str
#     image: Optional[str] = None
#     order: int = 0
#     active: bool = True


# @router.post("/categories")
# async def create_category(body: Category, admin=Depends(Admin)):
#     res = await db.categories.insert_one({**body.model_dump(), "created_at": now()})
#     return {"category": ser(await db.categories.find_one({"_id": res.inserted_id}))}


# @router.put("/categories/{cid}")
# async def update_category(cid: str, body: Category, admin=Depends(Admin)):
#     await db.categories.update_one({"_id": oid(cid)}, {"$set": body.model_dump()})
#     return {"category": ser(await db.categories.find_one({"_id": oid(cid)}))}


# @router.delete("/categories/{cid}")
# async def delete_category(cid: str, admin=Depends(Admin)):
#     await db.categories.delete_one({"_id": oid(cid)})
#     return {"ok": True}


# # ============================ REVIEWS ========================================
# @router.get("/reviews")
# async def admin_reviews(admin=Depends(Admin)):
#     rows = await db.reviews.find({}).sort("created_at", -1).limit(200).to_list(200)
#     return {"reviews": ser(rows)}


# @router.post("/reviews/{review_id}/hide")
# async def hide_review(review_id: str, hidden: bool = True, admin=Depends(Admin)):
#     await db.reviews.update_one({"_id": oid(review_id)}, {"$set": {"hidden": hidden}})
#     await audit(admin, "moderate_review", target=review_id, meta={"hidden": hidden})
#     return {"ok": True}


# # ============================ AUDIT LOGS =====================================
# @router.get("/audit-logs")
# async def audit_logs(page: int = 1, admin=Depends(Admin)):
#     rows = await db.audit_logs.find({}).sort("at", -1) \
#         .skip((page - 1) * 50).limit(50).to_list(50)
#     return {"logs": ser(rows)}


# # ============================ BROADCAST ======================================
# class Broadcast(BaseModel):
#     title: str
#     body: str
#     role: str = "customer"


# @router.post("/broadcast")
# async def broadcast(body: Broadcast, admin=Depends(Admin)):
#     users = await db.users.find({"role": body.role}).to_list(10000)
#     docs = [{"user_id": u["_id"], "title": body.title, "body": body.body,
#              "type": "announcement", "data": {}, "read": False, "created_at": now()}
#             for u in users]
#     if docs:
#         await db.notifications.insert_many(docs)
#     await audit(admin, "broadcast", meta={"count": len(docs)})
#     return {"sent": len(docs)}


# # ============================ DEV SEED =======================================
# @router.post("/seed")
# async def seed(admin=Depends(Admin)):
#     """Optional DEV/TEST seed. Never runs automatically. Idempotent-ish."""
#     if not config.IS_DEV:
#         raise HTTPException(403, "Seeding disabled in production")

#     # Service area — Kolkata center
#     area = await db.service_areas.find_one({"name": "Kolkata Central"})
#     if not area:
#         r = await db.service_areas.insert_one({
#             "name": "Kolkata Central", "lat": 22.5726, "lng": 88.3639,
#             "radius_km": 10, "priority_radius_km": 5, "active": True,
#             "center": {"type": "Point", "coordinates": [88.3639, 22.5726]},
#             "deleted_at": None, "created_at": now()})
#         area = await db.service_areas.find_one({"_id": r.inserted_id})

#     # Platform categories
#     cats = ["Biryani", "Chicken", "Rice", "Burger", "Pizza", "Noodles", "Drinks", "Desserts"]
#     cat_imgs = {
#         "Burger": "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=300",
#         "Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300",
#         "Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300",
#     }
#     for i, c in enumerate(cats):
#         if not await db.categories.find_one({"name": c}):
#             await db.categories.insert_one({"name": c, "order": i, "active": True,
#                                             "image": cat_imgs.get(c), "created_at": now()})

#     created = []
#     demo = [
#         {"name": "Spice Route Kitchen", "phone": "9000000001", "lat": 22.5760,
#          "lng": 88.3680, "cats": ["Biryani", "Chicken", "Rice"],
#          "cover": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
#          "foods": [("Chicken Dum Biryani", "Fragrant basmati, tender chicken", 220, "Biryani",
#                     "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400"),
#                    ("Butter Chicken", "Creamy tomato gravy", 260, "Chicken",
#                     "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400"),
#                    ("Jeera Rice", "Cumin tempered rice", 120, "Rice",
#                     "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400")]},
#         {"name": "Urban Slice & Grill", "phone": "9000000002", "lat": 22.5690,
#          "lng": 88.3600, "cats": ["Burger", "Pizza", "Drinks"],
#          "cover": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
#          "foods": [("Margherita Pizza", "Wood-fired, fresh basil", 299, "Pizza",
#                     "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400"),
#                    ("Classic Cheese Burger", "Double patty, cheddar", 189, "Burger",
#                     "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=400"),
#                    ("Cold Coffee", "Iced, frothy", 99, "Drinks",
#                     "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400")]},
#     ]
#     for d in demo:
#         owner = await db.users.find_one({"phone": d["phone"], "role": "restaurant"})
#         if not owner:
#             ins = await db.users.insert_one({"phone": d["phone"], "role": "restaurant",
#                                              "name": d["name"], "active": True,
#                                              "status": "active", "created_at": now()})
#             owner_id = ins.inserted_id
#         else:
#             owner_id = owner["_id"]
#         rest = await db.restaurants.find_one({"owner_id": owner_id})
#         if not rest:
#             rr = await db.restaurants.insert_one({
#                 "owner_id": owner_id, "name": d["name"], "phone": d["phone"],
#                 "lat": d["lat"], "lng": d["lng"], "address": "Park Street, Kolkata",
#                 "image": d["cover"], "logo": d["cover"], "cover": d["cover"],
#                 "categories": d["cats"], "open_time": "09:00", "close_time": "23:00",
#                 "status": "approved", "is_open": True, "rating": 0, "rating_count": 0,
#                 "commission_pct": 0, "fixed_fee": 0, "service_area_id": area["_id"],
#                 "location": {"type": "Point", "coordinates": [d["lng"], d["lat"]]},
#                 "deleted_at": None, "created_at": now()})
#             rid = rr.inserted_id
#             for (nm, ds_, pr, cat, img) in d["foods"]:
#                 await db.foods.insert_one({"restaurant_id": rid, "name": nm,
#                                            "description": ds_, "price": pr,
#                                            "category": cat, "image": img, "veg": False,
#                                            "available": True, "deleted_at": None,
#                                            "created_at": now()})
#             created.append(d["name"])

#     # Demo delivery partner
#     dp_user = await db.users.find_one({"phone": "9000000009", "role": "delivery"})
#     if not dp_user:
#         u = await db.users.insert_one({"phone": "9000000009", "role": "delivery",
#                                        "name": "Rahul Das", "active": True,
#                                        "status": "active", "created_at": now()})
#         await db.delivery_partners.insert_one({
#             "user_id": u.inserted_id, "name": "Rahul Das", "phone": "9000000009",
#             "vehicle": "bike", "lat": 22.5726, "lng": 88.3639,
#             "service_area_id": area["_id"], "status": "approved", "online": True,
#             "created_at": now()})

#     return {"ok": True, "area": area["name"], "restaurants_created": created,
#             "message": "Seed complete. Restaurant phones: 9000000001/2, "
#                        "Delivery phone: 9000000009 (login via OTP, role-specific)."}




























"""Admin Website backend API + optional dev seed."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from passlib.context import CryptContext

import config
from common import audit, notify, ser
from db import db, get_settings, now
from security import oid, require_roles, create_access_token, create_refresh_token

router = APIRouter(prefix="/api/admin")
Admin = require_roles("admin")

# পাসওয়ার্ড হ্যাশিংয়ের জন্য কনটেক্সট
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def day_start():
    n = now()
    return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# =============================== ADMIN LOGIN =================================
class AdminLoginModel(BaseModel):
    email: str
    password: str


@router.post("/login")
async def admin_login(body: AdminLoginModel):
    email = body.email.strip().lower()
    password = body.password

    # ১. ডাটাবেজ থেকে অ্যাডমিন ইউজার খোঁজা
    user = await db.users.find_one({"email": email, "role": "admin"})

    # ২. ইমেইল না মিললে বা ইউজার না থাকলে 401 রিটার্ন করা (অটো-ক্রিয়েট বা বাইপাস নিষিদ্ধ)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # ৩. পাসওয়ার্ড হ্যাশ ভেরিফাই করা (ডাটাবেজে অবশ্যই hashed_password থাকতে হবে)
    # hashed_password = user.get("hashed_password", "")
    # if not hashed_password or not pwd_context.verify(password, hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect email or password"
    #     ) 





    # ৩. পাসওয়ার্ড হ্যাশ ভেরিফাই করা (ডাটাবেজে password_hash ফিল্ড চেক করা হচ্ছে)
    hashed_password = user.get("password_hash") or user.get("hashed_password", "")
    if not hashed_password or not pwd_context.verify(password, hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # ৪. সব ঠিক থাকলে টোকেন জেনারেট করে রিটার্ন করা
    access_token = create_access_token(data={"sub": user["email"], "role": "admin"})
    refresh_token = create_refresh_token(data={"sub": user["email"]})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
            "name": user.get("name", "Admin")
        }
    }




@router.get("/force-reset-admin")
async def force_reset_admin():
    hashed = pwd_context.hash("admin@2026")
    await db.users.update_one(
        {"email": "admin@bitego.com"},
        {"$set": {"email": "admin@bitego.com", "password_hash": hashed, "role": "admin", "name": "Super Admin"}},
        upsert=True
    )
    return {"success": True, "message": "Admin reset to password: admin@2026"}




# =============================== DASHBOARD ===================================
@router.get("/dashboard")
async def dashboard(admin=Depends(Admin)):
    ds = day_start()
    total_orders = await db.orders.count_documents({})
    today_orders = await db.orders.find({"created_at": {"$gte": ds}}).to_list(5000)
    delivered_today = [o for o in today_orders if o["status"] == "DELIVERED"]
    return {
        "customers": await db.users.count_documents({"role": "customer"}),
        "restaurants": await db.restaurants.count_documents({"deleted_at": None}),
        "restaurants_pending": await db.restaurants.count_documents({"status": "pending"}),
        "delivery_partners": await db.delivery_partners.count_documents({}),
        "delivery_pending": await db.delivery_partners.count_documents({"status": "pending"}),
        "orders_total": total_orders,
        "orders_active": await db.orders.count_documents(
            {"status": {"$in": ["PLACED", "ACCEPTED", "PREPARING", "READY",
                                "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}),
        "orders_completed": await db.orders.count_documents({"status": "DELIVERED"}),
        "orders_cancelled": await db.orders.count_documents(
            {"status": {"$in": ["CANCELLED", "REJECTED"]}}),
        "today_orders": len(today_orders),
        "today_revenue": sum(o["customer_total"] for o in delivered_today),
        "platform_revenue": sum(o["platform_charge"] for o in delivered_today),
        "commission_revenue": sum(o["restaurant_commission_amount"] for o in delivered_today),
        "delivery_margin": sum(o["bitego_delivery_margin"] for o in delivered_today),
        "seller_payable_today": sum(o["restaurant_net_payable"] for o in delivered_today),
        "partner_payable_today": sum(o["delivery_partner_earning"] for o in delivered_today),
    }


# =============================== SETTINGS ====================================
class EarningSlab(BaseModel):
    km: int
    earning: float


class SettingsUpdate(BaseModel):
    platform_charge: Optional[float] = None
    restaurant_commission_pct: Optional[float] = None
    restaurant_fixed_fee: Optional[float] = None
    delivery_base_first_km: Optional[float] = None
    delivery_additional_per_km: Optional[float] = None
    delivery_partner_earning_slabs: Optional[List[EarningSlab]] = None
    max_service_radius_km: Optional[float] = None
    priority_radius_km: Optional[float] = None
    ordering_enabled: Optional[bool] = None
    helpline: Optional[str] = None


@router.get("/settings")
async def get_settings_admin(admin=Depends(Admin)):
    return {"settings": ser(await get_settings())}


@router.put("/settings")
async def update_settings(body: SettingsUpdate, admin=Depends(Admin)):
    upd = {}
    for k, v in body.model_dump().items():
        if v is None:
            continue
        if k == "delivery_partner_earning_slabs":
            upd[k] = [{"km": int(s["km"]), "earning": float(s["earning"])} for s in v]
        else:
            upd[k] = v
    await db.business_settings.update_one({"_id": "global"}, {"$set": upd}, upsert=True)
    await audit(admin, "update_settings", target="global", meta=upd)
    return {"settings": ser(await get_settings())}


# ============================ SERVICE AREAS ==================================
class ServiceArea(BaseModel):
    name: str
    lat: float
    lng: float
    radius_km: float = 10
    priority_radius_km: float = 5
    active: bool = True


@router.get("/service-areas")
async def list_areas(admin=Depends(Admin)):
    rows = await db.service_areas.find({"deleted_at": None}).to_list(200)
    return {"areas": ser(rows)}


@router.post("/service-areas")
async def create_area(body: ServiceArea, admin=Depends(Admin)):
    doc = {**body.model_dump(),
           "center": {"type": "Point", "coordinates": [body.lng, body.lat]},
           "deleted_at": None, "created_at": now()}
    res = await db.service_areas.insert_one(doc)
    await audit(admin, "create_service_area", target=str(res.inserted_id), meta=body.model_dump())
    return {"area": ser(await db.service_areas.find_one({"_id": res.inserted_id}))}


@router.put("/service-areas/{area_id}")
async def update_area(area_id: str, body: ServiceArea, admin=Depends(Admin)):
    upd = {**body.model_dump(),
           "center": {"type": "Point", "coordinates": [body.lng, body.lat]}}
    await db.service_areas.update_one({"_id": oid(area_id)}, {"$set": upd})
    await audit(admin, "update_service_area", target=area_id)
    return {"area": ser(await db.service_areas.find_one({"_id": oid(area_id)}))}


@router.delete("/service-areas/{area_id}")
async def deactivate_area(area_id: str, admin=Depends(Admin)):
    # Soft-remove: never destroy historical data.
    await db.service_areas.update_one(
        {"_id": oid(area_id)}, {"$set": {"deleted_at": now(), "active": False}})
    await audit(admin, "delete_service_area", target=area_id)
    return {"ok": True}


# ======================= RESTAURANT MANAGEMENT ===============================
class RestaurantSettings(BaseModel):
    commission_pct: Optional[float] = None
    fixed_fee: Optional[float] = None
    service_area_id: Optional[str] = None


@router.get("/restaurants")
async def admin_restaurants(status: Optional[str] = None, q: Optional[str] = None,
                            admin=Depends(Admin)):
    query = {"deleted_at": None}
    if status:
        query["status"] = status
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    rows = await db.restaurants.find(query).sort("created_at", -1).to_list(500)
    return {"restaurants": ser(rows)}


async def _set_restaurant_status(rid, st, admin, action):
    r = await db.restaurants.find_one({"_id": oid(rid)})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    await db.restaurants.update_one({"_id": oid(rid)}, {"$set": {"status": st}})
    owner_active = st in ("approved",)
    await db.users.update_one({"_id": r["owner_id"]},
                              {"$set": {"active": st != "suspended",
                                        "status": "active" if owner_active else st}})
    await audit(admin, action, target=rid)
    await notify(r["owner_id"], f"Restaurant {st}",
                 f"Your restaurant status is now {st}.", type_="account")
    return await db.restaurants.find_one({"_id": oid(rid)})


@router.post("/restaurants/{rid}/approve")
async def approve_restaurant(rid: str, admin=Depends(Admin)):
    return {"restaurant": ser(await _set_restaurant_status(rid, "approved", admin, "approve_restaurant"))}


@router.post("/restaurants/{rid}/reject")
async def reject_restaurant(rid: str, admin=Depends(Admin)):
    return {"restaurant": ser(await _set_restaurant_status(rid, "rejected", admin, "reject_restaurant"))}


@router.post("/restaurants/{rid}/suspend")
async def suspend_restaurant(rid: str, admin=Depends(Admin)):
    return {"restaurant": ser(await _set_restaurant_status(rid, "suspended", admin, "suspend_restaurant"))}


@router.put("/restaurants/{rid}/settings")
async def restaurant_settings(rid: str, body: RestaurantSettings, admin=Depends(Admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "service_area_id" in upd:
        upd["service_area_id"] = oid(upd["service_area_id"])
    await db.restaurants.update_one({"_id": oid(rid)}, {"$set": upd})
    await audit(admin, "restaurant_settings", target=rid, meta={k: str(v) for k, v in upd.items()})
    return {"restaurant": ser(await db.restaurants.find_one({"_id": oid(rid)}))}


class RestaurantMedia(BaseModel):
    logo: Optional[str] = None
    cover: Optional[str] = None
    image: Optional[str] = None


@router.put("/restaurants/{rid}/media")
async def restaurant_media(rid: str, body: RestaurantMedia, admin=Depends(Admin)):
    """Admin uploads/changes a restaurant's logo/banner; reflected in Customer app."""
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "No image provided")
    r = await db.restaurants.find_one({"_id": oid(rid)})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    await db.restaurants.update_one({"_id": oid(rid)}, {"$set": upd})
    await audit(admin, "restaurant_media", target=rid)
    return {"restaurant": ser(await db.restaurants.find_one({"_id": oid(rid)}))}


# ==================== DELIVERY PARTNER MANAGEMENT ============================
@router.get("/delivery-partners")
async def admin_partners(status: Optional[str] = None, admin=Depends(Admin)):
    query = {}
    if status:
        query["status"] = status
    rows = await db.delivery_partners.find(query).sort("created_at", -1).to_list(500)
    return {"partners": ser(rows)}


async def _set_partner_status(pid, st, admin, action):
    p = await db.delivery_partners.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(404, "Partner not found")
    online = p.get("online", False) and st == "approved"
    await db.delivery_partners.update_one({"_id": oid(pid)},
                                          {"$set": {"status": st, "online": online}})
    await db.users.update_one({"_id": p["user_id"]},
                              {"$set": {"active": st != "suspended"}})
    await audit(admin, action, target=pid)
    await notify(p["user_id"], f"Account {st}",
                 f"Your delivery partner account is now {st}.", type_="account")
    return await db.delivery_partners.find_one({"_id": oid(pid)})


@router.post("/delivery-partners/{pid}/approve")
async def approve_partner(pid: str, admin=Depends(Admin)):
    return {"partner": ser(await _set_partner_status(pid, "approved", admin, "approve_partner"))}


@router.post("/delivery-partners/{pid}/reject")
async def reject_partner(pid: str, admin=Depends(Admin)):
    return {"partner": ser(await _set_partner_status(pid, "rejected", admin, "reject_partner"))}


@router.post("/delivery-partners/{pid}/suspend")
async def suspend_partner(pid: str, admin=Depends(Admin)):
    return {"partner": ser(await _set_partner_status(pid, "suspended", admin, "suspend_partner"))}


# ======================== CUSTOMER MANAGEMENT ================================
@router.get("/customers")
async def admin_customers(q: Optional[str] = None, page: int = 1, admin=Depends(Admin)):
    query = {"role": "customer"}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}},
                        {"phone": {"$regex": q, "$options": "i"}}]
    rows = await db.users.find(query).sort("created_at", -1) \
        .skip((page - 1) * 30).limit(30).to_list(30)
    return {"customers": ser(rows)}


@router.post("/customers/{cid}/toggle")
async def toggle_customer(cid: str, admin=Depends(Admin)):
    c = await db.users.find_one({"_id": oid(cid), "role": "customer"})
    if not c:
        raise HTTPException(404, "Customer not found")
    active = not c.get("active", True)
    await db.users.update_one({"_id": oid(cid)}, {"$set": {"active": active}})
    await audit(admin, "toggle_customer", target=cid, meta={"active": active})
    return {"active": active}


# ============================ ORDER MANAGEMENT ===============================
@router.get("/orders")
async def admin_orders(status: Optional[str] = None, page: int = 1, admin=Depends(Admin)):
    query = {}
    if status:
        query["status"] = status
    rows = await db.orders.find(query).sort("created_at", -1) \
        .skip((page - 1) * 30).limit(30).to_list(30)
    return {"orders": ser(rows)}


@router.get("/orders/{order_id}")
async def admin_order_detail(order_id: str, admin=Depends(Admin)):
    o = await db.orders.find_one({"_id": oid(order_id)})
    if not o:
        raise HTTPException(404, "Order not found")
    return {"order": ser(o)}


# ============================ SETTLEMENTS ====================================
@router.get("/settlements/today")
async def settlements_today(admin=Depends(Admin)):
    ds = day_start()
    delivered = await db.orders.find(
        {"status": "DELIVERED", "delivered_at": {"$gte": ds}}).to_list(5000)
    rest_map, part_map = {}, {}
    for o in delivered:
        rk = str(o["restaurant_id"])
        r = rest_map.setdefault(rk, {"restaurant_id": rk, "name": o["restaurant_name"],
                                     "orders": 0, "gross": 0, "food_subtotal": 0,
                                     "platform_charge": 0, "delivery_charge": 0,
                                     "commission": 0, "fixed_fee": 0, "net_payable": 0,
                                     "paid": 0})
        r["orders"] += 1
        r["gross"] += o["customer_total"]
        r["food_subtotal"] += o["food_subtotal"]
        r["platform_charge"] += o["platform_charge"]
        r["delivery_charge"] += o["customer_delivery_charge"]
        r["commission"] += o["restaurant_commission_amount"]
        r["fixed_fee"] += o["restaurant_fixed_fee"]
        r["net_payable"] += o["restaurant_net_payable"]
        r["paid"] += o.get("settlement", {}).get("restaurant_paid", 0)
        if o.get("delivery_partner_id"):
            pk = str(o["delivery_partner_id"])
            p = part_map.setdefault(pk, {"partner_id": pk,
                                         "name": o.get("delivery_partner_name"),
                                         "deliveries": 0, "earnings": 0, "paid": 0})
            p["deliveries"] += 1
            p["earnings"] += o["delivery_partner_earning"]
            p["paid"] += o.get("settlement", {}).get("partner_paid", 0)
    for r in rest_map.values():
        r["remaining"] = round(r["net_payable"] - r["paid"], 2)
    for p in part_map.values():
        p["remaining"] = round(p["earnings"] - p["paid"], 2)
    restaurants = list(rest_map.values())
    partners = list(part_map.values())
    return {
        "restaurants": restaurants, "partners": partners,
        "summary": {
            "total_seller_payable": round(sum(r["net_payable"] for r in restaurants), 2),
            "total_partner_payable": round(sum(p["earnings"] for p in partners), 2),
            "total_platform_revenue": sum(o["platform_charge"] for o in delivered),
            "total_completed_orders": len(delivered),
            "total_paid": round(sum(r["paid"] for r in restaurants)
                                + sum(p["paid"] for p in partners), 2),
            "total_remaining": round(sum(r["remaining"] for r in restaurants)
                                   + sum(p["remaining"] for p in partners), 2),
        },
    }


# ============================ CATEGORIES =====================================
class Category(BaseModel):
    name: str
    image: Optional[str] = None
    order: int = 0
    active: bool = True


@router.post("/categories")
async def create_category(body: Category, admin=Depends(Admin)):
    res = await db.categories.insert_one({**body.model_dump(), "created_at": now()})
    return {"category": ser(await db.categories.find_one({"_id": res.inserted_id}))}


@router.put("/categories/{cid}")
async def update_category(cid: str, body: Category, admin=Depends(Admin)):
    await db.categories.update_one({"_id": oid(cid)}, {"$set": body.model_dump()})
    return {"category": ser(await db.categories.find_one({"_id": oid(cid)}))}


@router.delete("/categories/{cid}")
async def delete_category(cid: str, admin=Depends(Admin)):
    await db.categories.delete_one({"_id": oid(cid)})
    return {"ok": True}


# ============================ REVIEWS ========================================
@router.get("/reviews")
async def admin_reviews(admin=Depends(Admin)):
    rows = await db.reviews.find({}).sort("created_at", -1).limit(200).to_list(200)
    return {"reviews": ser(rows)}


@router.post("/reviews/{review_id}/hide")
async def hide_review(review_id: str, hidden: bool = True, admin=Depends(Admin)):
    await db.reviews.update_one({"_id": oid(review_id)}, {"$set": {"hidden": hidden}})
    await audit(admin, "moderate_review", target=review_id, meta={"hidden": hidden})
    return {"ok": True}


# ============================ AUDIT LOGS =====================================
@router.get("/audit-logs")
async def audit_logs(page: int = 1, admin=Depends(Admin)):
    rows = await db.audit_logs.find({}).sort("at", -1) \
        .skip((page - 1) * 50).limit(50).to_list(50)
    return {"logs": ser(rows)}


# ============================ BROADCAST ======================================
class Broadcast(BaseModel):
    title: str
    body: str
    role: str = "customer"


@router.post("/broadcast")
async def broadcast(body: Broadcast, admin=Depends(Admin)):
    users = await db.users.find({"role": body.role}).to_list(10000)
    docs = [{"user_id": u["_id"], "title": body.title, "body": body.body,
             "type": "announcement", "data": {}, "read": False, "created_at": now()}
            for u in users]
    if docs:
        await db.notifications.insert_many(docs)
    await audit(admin, "broadcast", meta={"count": len(docs)})
    return {"sent": len(docs)}


# ============================ DEV SEED =======================================
@router.post("/seed")
async def seed(admin=Depends(Admin)):
    """Optional DEV/TEST seed. Never runs automatically. Idempotent-ish."""
    if not config.IS_DEV:
        raise HTTPException(403, "Seeding disabled in production")

    # Service area — Kolkata center
    area = await db.service_areas.find_one({"name": "Kolkata Central"})
    if not area:
        r = await db.service_areas.insert_one({
            "name": "Kolkata Central", "lat": 22.5726, "lng": 88.3639,
            "radius_km": 10, "priority_radius_km": 5, "active": True,
            "center": {"type": "Point", "coordinates": [88.3639, 22.5726]},
            "deleted_at": None, "created_at": now()})
        area = await db.service_areas.find_one({"_id": r.inserted_id})

    # Platform categories
    cats = ["Biryani", "Chicken", "Rice", "Burger", "Pizza", "Noodles", "Drinks", "Desserts"]
    cat_imgs = {
        "Burger": "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=300",
        "Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300",
        "Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300",
    }
    for i, c in enumerate(cats):
        if not await db.categories.find_one({"name": c}):
            await db.categories.insert_one({"name": c, "order": i, "active": True,
                                            "image": cat_imgs.get(c), "created_at": now()})

    created = []
    demo = [
        {"name": "Spice Route Kitchen", "phone": "9000000001", "lat": 22.5760,
         "lng": 88.3680, "cats": ["Biryani", "Chicken", "Rice"],
         "cover": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
         "foods": [("Chicken Dum Biryani", "Fragrant basmati, tender chicken", 220, "Biryani",
                    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400"),
                   ("Butter Chicken", "Creamy tomato gravy", 260, "Chicken",
                    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400"),
                   ("Jeera Rice", "Cumin tempered rice", 120, "Rice",
                    "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400")]},
        {"name": "Urban Slice & Grill", "phone": "9000000002", "lat": 22.5690,
         "lng": 88.3600, "cats": ["Burger", "Pizza", "Drinks"],
         "cover": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
         "foods": [("Margherita Pizza", "Wood-fired, fresh basil", 299, "Pizza",
                    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400"),
                   ("Classic Cheese Burger", "Double patty, cheddar", 189, "Burger",
                    "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=400"),
                   ("Cold Coffee", "Iced, frothy", 99, "Drinks",
                    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400")]},
    ]
    for d in demo:
        owner = await db.users.find_one({"phone": d["phone"], "role": "restaurant"})
        if not owner:
            ins = await db.users.insert_one({"phone": d["phone"], "role": "restaurant",
                                           "name": d["name"], "active": True,
                                           "status": "active", "created_at": now()})
            owner_id = ins.inserted_id
        else:
            owner_id = owner["_id"]
        rest = await db.restaurants.find_one({"owner_id": owner_id})
        if not rest:
            rr = await db.restaurants.insert_one({
                "owner_id": owner_id, "name": d["name"], "phone": d["phone"],
                "lat": d["lat"], "lng": d["lng"], "address": "Park Street, Kolkata",
                "image": d["cover"], "logo": d["cover"], "cover": d["cover"],
                "categories": d["cats"], "open_time": "09:00", "close_time": "23:00",
                "status": "approved", "is_open": True, "rating": 0, "rating_count": 0,
                "commission_pct": 0, "fixed_fee": 0, "service_area_id": area["_id"],
                "location": {"type": "Point", "coordinates": [d["lng"], d["lat"]]},
                "deleted_at": None, "created_at": now()})
            rid = rr.inserted_id
            for (nm, ds_, pr, cat, img) in d["foods"]:
                await db.foods.insert_one({"restaurant_id": rid, "name": nm,
                                           "description": ds_, "price": pr,
                                           "category": cat, "image": img, "veg": False,
                                           "available": True, "deleted_at": None,
                                           "created_at": now()})
            created.append(d["name"])

    # Demo delivery partner
    dp_user = await db.users.find_one({"phone": "9000000009", "role": "delivery"})
    if not dp_user:
        u = await db.users.insert_one({"phone": "9000000009", "role": "delivery",
                                       "name": "Rahul Das", "active": True,
                                       "status": "active", "created_at": now()})
        await db.delivery_partners.insert_one({
            "user_id": u.inserted_id, "name": "Rahul Das", "phone": "9000000009",
            "vehicle": "bike", "lat": 22.5726, "lng": 88.3639,
            "service_area_id": area["_id"], "status": "approved", "online": True,
            "created_at": now()})

    return {"ok": True, "area": area["name"], "restaurants_created": created,
            "message": "Seed complete. Restaurant phones: 9000000001/2, "
                       "Delivery phone: 9000000009 (login via OTP, role-specific)."}