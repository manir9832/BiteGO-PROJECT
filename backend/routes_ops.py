# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                               user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
#     # match a service area (informational; admin can reassign)
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     return {"restaurant": ser(r), "registered": r is not None}


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o["food_subtotal"] for o in delivered_today)
#     net = sum(o["restaurant_net_payable"] for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                      reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- menu ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}) \
#         .to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o["food_subtotal"] for o in delivered)
#     commission = sum(o["restaurant_commission_amount"] for o in delivered)
#     fixed = sum(o["restaurant_fixed_fee"] for o in delivered)
#     net = sum(o["restaurant_net_payable"] for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}


# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p), "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         out.append({**ser(o), "your_earning": o["delivery_partner_earning"]})
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     # Atomic assignment — only one partner can win.
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
#     return {"order": ser(res), "your_earning": res["delivery_partner_earning"]}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                      extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                           {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
#     return {"orders": ser(rows)}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o["delivery_partner_earning"] for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o["delivery_partner_earning"] for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o["delivery_partner_earning"]}
#                     for o in delivered[-50:][::-1]],
#     }


























# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     if not user or "_id" not in user:
#         return None
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                               user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
    
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
            
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     return {"restaurant": ser(r) if r else None, "registered": r is not None}


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Restaurant not found")
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                      reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- MENU / FOODS (FIXED SAFE CHECK) ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"foods": []}  # রেস্তোরাঁ না থাকলে ক্র্যাশ না করে খালি অ্যারে দেবে

#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         raise HTTPException(404, "Register your restaurant first")
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o.get("food_subtotal", 0) for o in delivered)
#     commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
#     fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"reviews": [], "rating": 0, "rating_count": 0}
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}


# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     if not user or "_id" not in user:
#         return None
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p) if p else None, "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         out.append({**ser(o), "your_earning": o.get("delivery_partner_earning", 0)})
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
#     return {"order": ser(res), "your_earning": res.get("delivery_partner_earning", 0)}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                      extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                           {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
#     return {"orders": ser(rows)}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
#                     for o in delivered[-50:][::-1]],
#     }




























# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None  # নিশ্চিত করা হলো image নেওয়া হচ্ছে
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     if not user or "_id" not in user:
#         return None
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# # Helper function: Admin Approval Check Guard
# def _ensure_approved(restaurant):
#     if not restaurant:
#         raise HTTPException(404, "Register your restaurant first")
#     if restaurant.get("status") != "approved":
#         raise HTTPException(403, "Your restaurant is pending admin approval")


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                               user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
    
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
            
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     # is_approved এবং status স্পষ্ট করে পাঠানো হচ্ছে
#     return {
#         "restaurant": ser(r) if r else None, 
#         "registered": r is not None,
#         "is_approved": r.get("status") == "approved" if r else False,
#         "status": r.get("status", "pending") if r else None
#     }


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)  # Approval check
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)  # Approval check
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)  # Approval check
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                      reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- MENU / FOODS ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"foods": []}
#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)  # Approval check
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)  # Approval check
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)  # Approval check
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o.get("food_subtotal", 0) for o in delivered)
#     commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
#     fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"reviews": [], "rating": 0, "rating_count": 0}
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}

# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     if not user or "_id" not in user:
#         return None
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p) if p else None, "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         out.append({**ser(o), "your_earning": o.get("delivery_partner_earning", 0)})
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
#     return {"order": ser(res), "your_earning": res.get("delivery_partner_earning", 0)}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                      extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                           {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
#     return {"orders": ser(rows)}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
#                     for o in delivered[-50:][::-1]],
#     }


















# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     if not user or "_id" not in user:
#         return None
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# def _ensure_approved(restaurant):
#     if not restaurant:
#         raise HTTPException(404, "Register your restaurant first")
#     if restaurant.get("status") != "approved":
#         raise HTTPException(403, "Your restaurant is pending admin approval")


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                               user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
    
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
            
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     return {
#         "restaurant": ser(r) if r else None, 
#         "registered": r is not None,
#         "is_approved": r.get("status") == "approved" if r else False,
#         "status": r.get("status", "pending") if r else None
#     }


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                      reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- MENU / FOODS ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"foods": []}
#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o.get("food_subtotal", 0) for o in delivered)
#     commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
#     fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"reviews": [], "rating": 0, "rating_count": 0}
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}


# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     if not user or "_id" not in user:
#         return None
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# def extract_order_details(o: dict):
#     """Helper to extract correct customer phone number and total payable cash."""
#     addr = o.get("address") or {}
    
#     # Priority check for customer phone
#     phone = (
#         o.get("customer_phone")
#         or addr.get("phone")
#         or o.get("user_phone")
#         or o.get("customer_mobile")
#         or ""
#     )

#     # Priority check for total cash to collect (Fixed grand_total priority)
#     total = (
#         o.get("grand_total")
#         or o.get("total_payable")
#         or o.get("payable_amount")
#         or o.get("total")
#         or (o.get("food_subtotal", 0) + o.get("delivery_fee", 0))
#     )

#     return phone, total


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p) if p else None, "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         out.append({
#             **ser(o),
#             "your_earning": o.get("delivery_partner_earning", 0),
#             "customer_phone": phone,
#             "customer_total": total,
#             "payment_method": o.get("payment_method", "COD")
#         })
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
    
#     phone, total = extract_order_details(res)
#     order_data = ser(res)
#     order_data["customer_phone"] = phone
#     order_data["customer_total"] = total
#     order_data["payment_method"] = res.get("payment_method", "COD")

#     return {"order": order_data, "your_earning": res.get("delivery_partner_earning", 0)}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                      extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                           {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
    
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         order_dict = ser(o)
#         order_dict["customer_phone"] = phone
#         order_dict["customer_total"] = total
#         order_dict["payment_method"] = o.get("payment_method", "COD")
#         out.append(order_dict)
        
#     return {"orders": out}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
#                     for o in delivered[-50:][::-1]],
#     }
































# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     if not user or "_id" not in user:
#         return None
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# def _ensure_approved(restaurant):
#     if not restaurant:
#         raise HTTPException(404, "Register your restaurant first")
#     if restaurant.get("status") != "approved":
#         raise HTTPException(403, "Your restaurant is pending admin approval")


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                             user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
    
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
            
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     return {
#         "restaurant": ser(r) if r else None, 
#         "registered": r is not None,
#         "is_approved": r.get("status") == "approved" if r else False,
#         "status": r.get("status", "pending") if r else None
#     }


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                    reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- MENU / FOODS ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"foods": []}
#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o.get("food_subtotal", 0) for o in delivered)
#     commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
#     fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"reviews": [], "rating": 0, "rating_count": 0}
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}


# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     if not user or "_id" not in user:
#         return None
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# def extract_order_details(o: dict):
#     """Helper to extract correct customer phone number and total payable cash."""
#     addr = o.get("address") or {}
    
#     # Priority check for customer phone
#     phone = (
#         o.get("customer_phone")
#         or addr.get("phone")
#         or o.get("user_phone")
#         or o.get("customer_mobile")
#         or ""
#     )

#     # Priority check for total cash to collect (Updated with more fields)
#     total = (
#         o.get("grand_total")
#         or o.get("total_payable")
#         or o.get("payable_amount")
#         or o.get("total")
#         or o.get("total_amount")
#         or o.get("amount")
#         or o.get("net_total")
#         or (o.get("food_subtotal", 0) + o.get("delivery_fee", 0))
#     )

#     return phone, total


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p) if p else None, "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         out.append({
#             **ser(o),
#             "your_earning": o.get("delivery_partner_earning", 0),
#             "customer_phone": phone,
#             "customer_total": total,
#             "payment_method": o.get("payment_method", "COD")
#         })
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
    
#     phone, total = extract_order_details(res)
#     order_data = ser(res)
#     order_data["customer_phone"] = phone
#     order_data["customer_total"] = total
#     order_data["payment_method"] = res.get("payment_method", "COD")

#     return {"order": order_data, "your_earning": res.get("delivery_partner_earning", 0)}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                    extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                         {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
    
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         order_dict = ser(o)
#         order_dict["customer_phone"] = phone
#         order_dict["customer_total"] = total
#         order_dict["payment_method"] = o.get("payment_method", "COD")
#         out.append(order_dict)
        
#     return {"orders": out}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
#                     for o in delivered[-50:][::-1]],
#     }




























# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     if not user or "_id" not in user:
#         return None
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# def _ensure_approved(restaurant):
#     if not restaurant:
#         raise HTTPException(404, "Register your restaurant first")
#     if restaurant.get("status") != "approved":
#         raise HTTPException(403, "Your restaurant is pending admin approval")


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                             user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
    
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
            
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     return {
#         "restaurant": ser(r) if r else None, 
#         "registered": r is not None,
#         "is_approved": r.get("status") == "approved" if r else False,
#         "status": r.get("status", "pending") if r else None
#     }


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                    reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- MENU / FOODS ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"foods": []}
#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o.get("food_subtotal", 0) for o in delivered)
#     commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
#     fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"reviews": [], "rating": 0, "rating_count": 0}
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}


# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     if not user or "_id" not in user:
#         return None
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# def extract_order_details(o: dict):
#     """Helper to extract correct customer phone number and total payable cash."""
#     addr = o.get("address") or {}
    
#     # Priority check for customer phone
#     phone = (
#         o.get("customer_phone")
#         or addr.get("phone")
#         or o.get("user_phone")
#         or o.get("customer_mobile")
#         or ""
#     )

#     # Priority check for total cash to collect (finance.py এর customer_total সবার উপরে যুক্ত করা হলো)
#     total = (
#         o.get("customer_total")   # <--- এই মূল ফিল্ডটি সবার উপরে রাখা হলো
#         or o.get("grand_total")
#         or o.get("total_payable")
#         or o.get("payable_amount")
#         or o.get("total")
#         or o.get("total_amount")
#         or o.get("amount")
#         or o.get("net_total")
#         or (o.get("food_subtotal", 0) + o.get("delivery_fee", 0))
#     )

#     return phone, total


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p) if p else None, "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         out.append({
#             **ser(o),
#             "your_earning": o.get("delivery_partner_earning", 0),
#             "customer_phone": phone,
#             "customer_total": total,
#             "payment_method": o.get("payment_method", "COD")
#         })
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
    
#     phone, total = extract_order_details(res)
#     order_data = ser(res)
#     order_data["customer_phone"] = phone
#     order_data["customer_total"] = total
#     order_data["payment_method"] = res.get("payment_method", "COD")

#     return {"order": order_data, "your_earning": res.get("delivery_partner_earning", 0)}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                    extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                         {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
    
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         order_dict = ser(o)
#         order_dict["customer_phone"] = phone
#         order_dict["customer_total"] = total
#         order_dict["payment_method"] = o.get("payment_method", "COD")
#         out.append(order_dict)
        
#     return {"orders": out}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
#                     for o in delivered[-50:][::-1]],
#     }



























# """Restaurant-owner and Delivery-partner API (backend for those apps)."""
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, Field

# import finance
# from common import ACTIVE_STATUSES, notify, ser, transition_order
# from db import db, get_settings, now
# from security import current_user, oid, require_roles

# router = APIRouter(prefix="/api")


# def day_start():
#     n = now()
#     return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# # =========================== RESTAURANT APP ==================================
# class RestaurantRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     address: str
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     categories: List[str] = []
#     open_time: str = "09:00"
#     close_time: str = "22:00"


# class RestaurantProfile(BaseModel):
#     name: Optional[str] = None
#     image: Optional[str] = None
#     logo: Optional[str] = None
#     cover: Optional[str] = None
#     address: Optional[str] = None
#     lat: Optional[float] = None
#     lng: Optional[float] = None
#     categories: Optional[List[str]] = None
#     open_time: Optional[str] = None
#     close_time: Optional[str] = None
#     is_open: Optional[bool] = None


# class FoodBody(BaseModel):
#     name: str
#     description: str = ""
#     price: int = Field(ge=0)
#     category: str
#     image: Optional[str] = None
#     veg: bool = True
#     available: bool = True


# async def _my_restaurant(user):
#     if not user or "_id" not in user:
#         return None
#     r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
#     return r


# def _ensure_approved(restaurant):
#     if not restaurant:
#         raise HTTPException(404, "Register your restaurant first")
#     if restaurant.get("status") != "approved":
#         raise HTTPException(403, "Your restaurant is pending admin approval")


# @router.post("/restaurant/register")
# async def restaurant_register(body: RestaurantRegister,
#                             user=Depends(require_roles("restaurant"))):
#     if await _my_restaurant(user):
#         raise HTTPException(409, "Restaurant already registered")
    
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     settings = await get_settings()
#     area_id = None
#     for a in areas:
#         if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
#                 (a.get("radius_km") or settings["max_service_radius_km"]):
#             area_id = a["_id"]
#             break
            
#     doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
#            "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
#            "commission_pct": settings["restaurant_commission_pct"],
#            "fixed_fee": settings["restaurant_fixed_fee"],
#            "service_area_id": area_id,
#            "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
#            "deleted_at": None, "created_at": now()}
#     res = await db.restaurants.insert_one(doc)
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


# @router.get("/restaurant/me")
# async def restaurant_me(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     return {
#         "restaurant": ser(r) if r else None, 
#         "registered": r is not None,
#         "is_approved": r.get("status") == "approved" if r else False,
#         "status": r.get("status", "pending") if r else None
#     }


# @router.put("/restaurant/profile")
# async def restaurant_update(body: RestaurantProfile,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
    
#     upd = {k: v for k, v in body.model_dump().items() if v is not None}
    
#     # ব্যাকএন্ড সেফটি: ব্যানার এবং ইমেজ ফিল্ড একসাথে সিঙ্ক রাখা
#     if "cover" in upd and "image" not in upd and upd["cover"]:
#         upd["image"] = upd["cover"]
#     elif "image" in upd and "cover" not in upd and upd["image"]:
#         upd["cover"] = upd["image"]

#     if "lat" in upd and "lng" in upd:
#         upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
        
#     await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
#     return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


# @router.get("/restaurant/dashboard")
# async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     rid = r["_id"]
#     ds = day_start()
#     today = await db.orders.find(
#         {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
#     delivered_today = [o for o in today if o["status"] == "DELIVERED"]
#     gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
#     counts = {}
#     for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
#         counts[st] = await db.orders.count_documents(
#             {"restaurant_id": rid, "status": st})
#     return {"restaurant": ser(r), "counts": counts,
#             "today": {"orders": len(today), "delivered": len(delivered_today),
#                       "gross_sales": gross, "net_earning": net}}


# @router.get("/restaurant/orders")
# async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
#                             user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     q = {"restaurant_id": r["_id"]}
#     if kind == "new":
#         q["status"] = "PLACED"
#     elif kind == "active":
#         q["status"] = {"$in": ACTIVE_STATUSES}
#     elif kind == "completed":
#         q["status"] = "DELIVERED"
#     elif kind == "cancelled":
#         q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
#     rows = await db.orders.find(q).sort("created_at", -1) \
#         .skip((page - 1) * limit).limit(limit).to_list(limit)
#     return {"orders": ser(rows)}


# async def _restaurant_order(user, order_id):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     return o


# @router.post("/restaurant/orders/{order_id}/accept")
# async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "ACCEPTED", by="restaurant")
#     await notify(o["customer_id"], "Order accepted",
#                  f"{o['restaurant_name']} accepted your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/reject")
# async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "REJECTED", by="restaurant",
#                                    reason="Rejected by restaurant")
#     await notify(o["customer_id"], "Order rejected",
#                  f"{o['restaurant_name']} could not accept your order.")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/preparing")
# async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "PREPARING", by="restaurant")
#     await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
#     return {"order": ser(updated)}


# @router.post("/restaurant/orders/{order_id}/ready")
# async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
#     o = await _restaurant_order(user, order_id)
#     updated = await transition_order(o, "READY", by="restaurant")
#     await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
#     return {"order": ser(updated)}


# # --- MENU / FOODS ---
# @router.get("/restaurant/foods")
# async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
#     r = await _my_restaurant(user)
#     if not r:
#         return {"foods": []}
#     rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
#     return {"foods": ser(rows)}


# @router.post("/restaurant/foods")
# async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     doc = {**body.model_dump(), "restaurant_id": r["_id"],
#            "deleted_at": None, "created_at": now()}
#     res = await db.foods.insert_one(doc)
#     return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


# @router.put("/restaurant/foods/{food_id}")
# async def edit_food(food_id: str, body: FoodBody,
#                     user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": body.model_dump()})
#     return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


# @router.delete("/restaurant/foods/{food_id}")
# async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     _ensure_approved(r)
#     await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
#                               {"$set": {"deleted_at": now(), "available": False}})
#     return {"ok": True}


# @router.get("/restaurant/earnings")
# async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
#     delivered = await db.orders.find(
#         {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
#     gross = sum(o.get("food_subtotal", 0) for o in delivered)
#     commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
#     fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
#     net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
#     return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
#             "net_earning": net, "orders": len(delivered)}


# @router.get("/restaurant/reviews")
# async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
#     r = await _my_restaurant(user)
#     if not r or r.get("status") != "approved":
#         return {"reviews": [], "rating": 0, "rating_count": 0}
#     rows = await db.reviews.find(
#         {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
#     ).sort("created_at", -1).to_list(100)
#     return {"reviews": ser(rows), "rating": r.get("rating", 0),
#             "rating_count": r.get("rating_count", 0)}


# # =========================== DELIVERY PARTNER APP ============================
# class DeliveryRegister(BaseModel):
#     name: str
#     lat: float
#     lng: float
#     vehicle: str = "bike"


# class OnlineBody(BaseModel):
#     online: bool
#     lat: Optional[float] = None
#     lng: Optional[float] = None


# class LocBody(BaseModel):
#     lat: float
#     lng: float


# async def _partner(user):
#     if not user or "_id" not in user:
#         return None
#     return await db.delivery_partners.find_one({"user_id": user["_id"]})


# def extract_order_details(o: dict):
#     """Helper to extract correct customer phone number and total payable cash."""
#     addr = o.get("address") or {}
    
#     phone = (
#         o.get("customer_phone")
#         or addr.get("phone")
#         or o.get("user_phone")
#         or o.get("customer_mobile")
#         or ""
#     )

#     total = (
#         o.get("customer_total")
#         or o.get("grand_total")
#         or o.get("total_payable")
#         or o.get("payable_amount")
#         or o.get("total")
#         or o.get("total_amount")
#         or o.get("amount")
#         or o.get("net_total")
#         or (o.get("food_subtotal", 0) + o.get("delivery_fee", 0))
#     )

#     return phone, total


# @router.post("/delivery/register")
# async def delivery_register(body: DeliveryRegister,
#                             user=Depends(require_roles("delivery"))):
#     if await _partner(user):
#         raise HTTPException(409, "Already registered")
#     settings = await get_settings()
#     areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
#     area_id = next((a["_id"] for a in areas
#                     if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
#                     <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
#     doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
#            "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
#            "service_area_id": area_id, "status": "pending", "online": False,
#            "created_at": now()}
#     await db.delivery_partners.insert_one(doc)
#     await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/me")
# async def delivery_me(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     return {"partner": ser(p) if p else None, "registered": p is not None}


# @router.post("/delivery/online")
# async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     if p["status"] != "approved":
#         raise HTTPException(403, "Your account is not approved yet")
#     upd = {"online": body.online}
#     if body.lat is not None:
#         upd["lat"], upd["lng"] = body.lat, body.lng
#     await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
#     return {"partner": ser(await _partner(user))}


# @router.get("/delivery/requests")
# async def delivery_requests(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved" or not p.get("online"):
#         return {"requests": []}
#     q = {"status": "READY", "delivery_partner_id": None}
#     if p.get("service_area_id"):
#         q["service_area_id"] = p["service_area_id"]
#     rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         out.append({
#             **ser(o),
#             "your_earning": o.get("delivery_partner_earning", 0),
#             "customer_phone": phone,
#             "customer_total": total,
#             "payment_method": o.get("payment_method", "COD")
#         })
#     return {"requests": out}


# @router.post("/delivery/orders/{order_id}/accept")
# async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p or p["status"] != "approved":
#         raise HTTPException(403, "Not approved")
#     res = await db.orders.find_one_and_update(
#         {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
#         {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
#                   "delivery_partner_name": p["name"],
#                   "delivery_partner_phone": p.get("phone"), "updated_at": now()},
#          "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
#                                 "by": "delivery", "reason": None}}},
#         return_document=True)
#     if not res:
#         raise HTTPException(409, "Delivery already assigned")
#     await notify(res["customer_id"], "Delivery partner assigned",
#                  f"{p['name']} will deliver your order.")
    
#     phone, total = extract_order_details(res)
#     order_data = ser(res)
#     order_data["customer_phone"] = phone
#     order_data["customer_total"] = total
#     order_data["payment_method"] = res.get("payment_method", "COD")

#     return {"order": order_data, "your_earning": res.get("delivery_partner_earning", 0)}


# @router.post("/delivery/orders/{order_id}/pickup")
# async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "PICKED_UP", by="delivery")
#     await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/start")
# async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
#     await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/deliver")
# async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     o = await db.orders.find_one({"_id": oid(order_id),
#                                   "delivery_partner_id": p["_id"]})
#     if not o:
#         raise HTTPException(404, "Order not found")
#     updated = await transition_order(o, "DELIVERED", by="delivery",
#                                    extra={"delivered_at": now()})
#     await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
#     return {"order": ser(updated)}


# @router.post("/delivery/orders/{order_id}/location")
# async def delivery_location(order_id: str, body: LocBody,
#                             user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         raise HTTPException(404, "Register first")
#     await db.orders.update_one(
#         {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
#         {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
#                                        "at": now()}}})
#     await db.delivery_partners.update_one({"_id": p["_id"]},
#                                         {"$set": {"lat": body.lat, "lng": body.lng}})
#     return {"ok": True}


# @router.get("/delivery/active")
# async def delivery_active(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"orders": []}
#     rows = await db.orders.find(
#         {"delivery_partner_id": p["_id"],
#          "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
#     ).sort("created_at", -1).to_list(20)
    
#     out = []
#     for o in rows:
#         phone, total = extract_order_details(o)
#         order_dict = ser(o)
#         order_dict["customer_phone"] = phone
#         order_dict["customer_total"] = total
#         order_dict["payment_method"] = o.get("payment_method", "COD")
#         out.append(order_dict)
        
#     return {"orders": out}


# @router.get("/delivery/earnings")
# async def delivery_earnings(user=Depends(require_roles("delivery"))):
#     p = await _partner(user)
#     if not p:
#         return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
#                 "today_deliveries": 0, "history": []}
#     delivered = await db.orders.find(
#         {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
#     ds = day_start()
#     today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
#     return {
#         "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
#         "total_deliveries": len(delivered),
#         "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
#         "today_deliveries": len(today),
#         "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
#                     for o in delivered[-50:][::-1]],
#     }



# @router.get("/public/settings")
# async def get_public_settings():
#     settings = await get_settings()
#     return {"helpline": settings.get("helpline", "9832413545")}






























"""Restaurant-owner and Delivery-partner API (backend for those apps)."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import finance
from common import ACTIVE_STATUSES, notify, ser, transition_order
from db import db, get_settings, now
from security import current_user, oid, require_roles

router = APIRouter(prefix="/api")


def day_start():
    n = now()
    return datetime(n.year, n.month, n.day, tzinfo=timezone.utc)


# =========================== PUSH TOKEN ROUTE ===============================
class PushTokenBody(BaseModel):
    push_token: str


@router.post("/users/push-token")
async def save_push_token(body: PushTokenBody, user=Depends(current_user)):
    await db.users.update_one(
        {"_id": user["_id"]}, 
        {"$set": {"push_token": body.push_token}}
    )
    return {"ok": True}


# =========================== RESTAURANT APP ==================================
class RestaurantRegister(BaseModel):
    name: str
    lat: float
    lng: float
    address: str
    image: Optional[str] = None
    logo: Optional[str] = None
    cover: Optional[str] = None
    categories: List[str] = []
    open_time: str = "09:00"
    close_time: str = "22:00"


class RestaurantProfile(BaseModel):
    name: Optional[str] = None
    image: Optional[str] = None
    logo: Optional[str] = None
    cover: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    categories: Optional[List[str]] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    is_open: Optional[bool] = None


class FoodBody(BaseModel):
    name: str
    description: str = ""
    price: int = Field(ge=0)
    category: str
    image: Optional[str] = None
    veg: bool = True
    available: bool = True


async def _my_restaurant(user):
    if not user or "_id" not in user:
        return None
    r = await db.restaurants.find_one({"owner_id": user["_id"], "deleted_at": None})
    return r


def _ensure_approved(restaurant):
    if not restaurant:
        raise HTTPException(404, "Register your restaurant first")
    if restaurant.get("status") != "approved":
        raise HTTPException(403, "Your restaurant is pending admin approval")


@router.post("/restaurant/register")
async def restaurant_register(body: RestaurantRegister,
                            user=Depends(require_roles("restaurant"))):
    if await _my_restaurant(user):
        raise HTTPException(409, "Restaurant already registered")
    
    areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
    settings = await get_settings()
    area_id = None
    for a in areas:
        if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"]) <= \
                (a.get("radius_km") or settings["max_service_radius_km"]):
            area_id = a["_id"]
            break
            
    doc = {**body.model_dump(), "owner_id": user["_id"], "phone": user.get("phone"),
           "status": "pending", "is_open": False, "rating": 0, "rating_count": 0,
           "commission_pct": settings["restaurant_commission_pct"],
           "fixed_fee": settings["restaurant_fixed_fee"],
           "service_area_id": area_id,
           "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
           "deleted_at": None, "created_at": now()}
    res = await db.restaurants.insert_one(doc)
    return {"restaurant": ser(await db.restaurants.find_one({"_id": res.inserted_id}))}


@router.get("/restaurant/me")
async def restaurant_me(user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    return {
        "restaurant": ser(r) if r else None, 
        "registered": r is not None,
        "is_approved": r.get("status") == "approved" if r else False,
        "status": r.get("status", "pending") if r else None
    }


@router.put("/restaurant/profile")
async def restaurant_update(body: RestaurantProfile,
                            user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    
    # ব্যাকএন্ড সেফটি: ব্যানার এবং ইমেজ ফিল্ড একসাথে সিঙ্ক রাখা
    if "cover" in upd and "image" not in upd and upd["cover"]:
        upd["image"] = upd["cover"]
    elif "image" in upd and "cover" not in upd and upd["image"]:
        upd["cover"] = upd["image"]

    if "lat" in upd and "lng" in upd:
        upd["location"] = {"type": "Point", "coordinates": [upd["lng"], upd["lat"]]}
        
    await db.restaurants.update_one({"_id": r["_id"]}, {"$set": upd})
    return {"restaurant": ser(await db.restaurants.find_one({"_id": r["_id"]}))}


@router.get("/restaurant/dashboard")
async def restaurant_dashboard(user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    rid = r["_id"]
    ds = day_start()
    today = await db.orders.find(
        {"restaurant_id": rid, "created_at": {"$gte": ds}}).to_list(1000)
    delivered_today = [o for o in today if o["status"] == "DELIVERED"]
    gross = sum(o.get("food_subtotal", 0) for o in delivered_today)
    net = sum(o.get("restaurant_net_payable", 0) for o in delivered_today)
    counts = {}
    for st in ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]:
        counts[st] = await db.orders.count_documents(
            {"restaurant_id": rid, "status": st})
    return {"restaurant": ser(r), "counts": counts,
            "today": {"orders": len(today), "delivered": len(delivered_today),
                      "gross_sales": gross, "net_earning": net}}


@router.get("/restaurant/orders")
async def restaurant_orders(kind: str = "active", page: int = 1, limit: int = 20,
                            user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    q = {"restaurant_id": r["_id"]}
    if kind == "new":
        q["status"] = "PLACED"
    elif kind == "active":
        q["status"] = {"$in": ACTIVE_STATUSES}
    elif kind == "completed":
        q["status"] = "DELIVERED"
    elif kind == "cancelled":
        q["status"] = {"$in": ["CANCELLED", "REJECTED"]}
    rows = await db.orders.find(q).sort("created_at", -1) \
        .skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"orders": ser(rows)}


async def _restaurant_order(user, order_id):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    o = await db.orders.find_one({"_id": oid(order_id), "restaurant_id": r["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@router.post("/restaurant/orders/{order_id}/accept")
async def accept_order(order_id: str, user=Depends(require_roles("restaurant"))):
    o = await _restaurant_order(user, order_id)
    updated = await transition_order(o, "ACCEPTED", by="restaurant")
    await notify(o["customer_id"], "Order accepted",
                 f"{o['restaurant_name']} accepted your order.")
    return {"order": ser(updated)}


@router.post("/restaurant/orders/{order_id}/reject")
async def reject_order(order_id: str, user=Depends(require_roles("restaurant"))):
    o = await _restaurant_order(user, order_id)
    updated = await transition_order(o, "REJECTED", by="restaurant",
                                   reason="Rejected by restaurant")
    await notify(o["customer_id"], "Order rejected",
                 f"{o['restaurant_name']} could not accept your order.")
    return {"order": ser(updated)}


@router.post("/restaurant/orders/{order_id}/preparing")
async def preparing_order(order_id: str, user=Depends(require_roles("restaurant"))):
    o = await _restaurant_order(user, order_id)
    updated = await transition_order(o, "PREPARING", by="restaurant")
    await notify(o["customer_id"], "Preparing your food", "The kitchen is on it!")
    return {"order": ser(updated)}


@router.post("/restaurant/orders/{order_id}/ready")
async def ready_order(order_id: str, user=Depends(require_roles("restaurant"))):
    o = await _restaurant_order(user, order_id)
    updated = await transition_order(o, "READY", by="restaurant")
    await notify(o["customer_id"], "Food ready", "Waiting for a delivery partner.")
    return {"order": ser(updated)}


# --- MENU / FOODS ---
@router.get("/restaurant/foods")
async def restaurant_foods(user=Depends(require_roles("restaurant", "admin"))):
    r = await _my_restaurant(user)
    if not r:
        return {"foods": []}
    rows = await db.foods.find({"restaurant_id": r["_id"], "deleted_at": None}).to_list(500)
    return {"foods": ser(rows)}


@router.post("/restaurant/foods")
async def add_food(body: FoodBody, user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    doc = {**body.model_dump(), "restaurant_id": r["_id"],
           "deleted_at": None, "created_at": now()}
    res = await db.foods.insert_one(doc)
    return {"food": ser(await db.foods.find_one({"_id": res.inserted_id}))}


@router.put("/restaurant/foods/{food_id}")
async def edit_food(food_id: str, body: FoodBody,
                    user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
                              {"$set": body.model_dump()})
    return {"food": ser(await db.foods.find_one({"_id": oid(food_id)}))}


@router.delete("/restaurant/foods/{food_id}")
async def delete_food(food_id: str, user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    _ensure_approved(r)
    await db.foods.update_one({"_id": oid(food_id), "restaurant_id": r["_id"]},
                              {"$set": {"deleted_at": now(), "available": False}})
    return {"ok": True}


@router.get("/restaurant/earnings")
async def restaurant_earnings(user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    if not r or r.get("status") != "approved":
        return {"gross_sales": 0, "commission": 0, "fixed_fee": 0, "net_earning": 0, "orders": 0}
    delivered = await db.orders.find(
        {"restaurant_id": r["_id"], "status": "DELIVERED"}).to_list(1000)
    gross = sum(o.get("food_subtotal", 0) for o in delivered)
    commission = sum(o.get("restaurant_commission_amount", 0) for o in delivered)
    fixed = sum(o.get("restaurant_fixed_fee", 0) for o in delivered)
    net = sum(o.get("restaurant_net_payable", 0) for o in delivered)
    return {"gross_sales": gross, "commission": commission, "fixed_fee": fixed,
            "net_earning": net, "orders": len(delivered)}


@router.get("/restaurant/reviews")
async def restaurant_reviews(user=Depends(require_roles("restaurant"))):
    r = await _my_restaurant(user)
    if not r or r.get("status") != "approved":
        return {"reviews": [], "rating": 0, "rating_count": 0}
    rows = await db.reviews.find(
        {"restaurant_id": r["_id"], "hidden": {"$ne": True}}
    ).sort("created_at", -1).to_list(100)
    return {"reviews": ser(rows), "rating": r.get("rating", 0),
            "rating_count": r.get("rating_count", 0)}


# =========================== DELIVERY PARTNER APP ============================
class DeliveryRegister(BaseModel):
    name: str
    lat: float
    lng: float
    vehicle: str = "bike"


class OnlineBody(BaseModel):
    online: bool
    lat: Optional[float] = None
    lng: Optional[float] = None


class LocBody(BaseModel):
    lat: float
    lng: float


async def _partner(user):
    if not user or "_id" not in user:
        return None
    return await db.delivery_partners.find_one({"user_id": user["_id"]})


def extract_order_details(o: dict):
    """Helper to extract correct customer phone number and total payable cash."""
    addr = o.get("address") or {}
    
    phone = (
        o.get("customer_phone")
        or addr.get("phone")
        or o.get("user_phone")
        or o.get("customer_mobile")
        or ""
    )

    total = (
        o.get("customer_total")
        or o.get("grand_total")
        or o.get("total_payable")
        or o.get("payable_amount")
        or o.get("total")
        or o.get("total_amount")
        or o.get("amount")
        or o.get("net_total")
        or (o.get("food_subtotal", 0) + o.get("delivery_fee", 0))
    )

    return phone, total


@router.post("/delivery/register")
async def delivery_register(body: DeliveryRegister,
                            user=Depends(require_roles("delivery"))):
    if await _partner(user):
        raise HTTPException(409, "Already registered")
    settings = await get_settings()
    areas = await db.service_areas.find({"active": True, "deleted_at": None}).to_list(100)
    area_id = next((a["_id"] for a in areas
                    if finance.haversine_km(body.lat, body.lng, a["lat"], a["lng"])
                    <= (a.get("radius_km") or settings["max_service_radius_km"])), None)
    doc = {"user_id": user["_id"], "name": body.name, "phone": user.get("phone"),
           "vehicle": body.vehicle, "lat": body.lat, "lng": body.lng,
           "service_area_id": area_id, "status": "pending", "online": False,
           "created_at": now()}
    await db.delivery_partners.insert_one(doc)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": body.name}})
    return {"partner": ser(await _partner(user))}


@router.get("/delivery/me")
async def delivery_me(user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    return {"partner": ser(p) if p else None, "registered": p is not None}


@router.post("/delivery/online")
async def delivery_online(body: OnlineBody, user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        raise HTTPException(404, "Register first")
    if p["status"] != "approved":
        raise HTTPException(403, "Your account is not approved yet")
    upd = {"online": body.online}
    if body.lat is not None:
        upd["lat"], upd["lng"] = body.lat, body.lng
    await db.delivery_partners.update_one({"_id": p["_id"]}, {"$set": upd})
    return {"partner": ser(await _partner(user))}


@router.get("/delivery/requests")
async def delivery_requests(user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p or p["status"] != "approved" or not p.get("online"):
        return {"requests": []}
    q = {"status": "READY", "delivery_partner_id": None}
    if p.get("service_area_id"):
        q["service_area_id"] = p["service_area_id"]
    rows = await db.orders.find(q).sort("created_at", 1).to_list(50)
    out = []
    for o in rows:
        phone, total = extract_order_details(o)
        out.append({
            **ser(o),
            "your_earning": o.get("delivery_partner_earning", 0),
            "customer_phone": phone,
            "customer_total": total,
            "payment_method": o.get("payment_method", "COD")
        })
    return {"requests": out}


@router.post("/delivery/orders/{order_id}/accept")
async def delivery_accept(order_id: str, user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p or p["status"] != "approved":
        raise HTTPException(403, "Not approved")
    res = await db.orders.find_one_and_update(
        {"_id": oid(order_id), "status": "READY", "delivery_partner_id": None},
        {"$set": {"status": "ASSIGNED", "delivery_partner_id": p["_id"],
                  "delivery_partner_name": p["name"],
                  "delivery_partner_phone": p.get("phone"), "updated_at": now()},
         "$push": {"timeline": {"status": "ASSIGNED", "at": now(),
                                "by": "delivery", "reason": None}}},
        return_document=True)
    if not res:
        raise HTTPException(409, "Delivery already assigned")
    await notify(res["customer_id"], "Delivery partner assigned",
                 f"{p['name']} will deliver your order.")
    
    phone, total = extract_order_details(res)
    order_data = ser(res)
    order_data["customer_phone"] = phone
    order_data["customer_total"] = total
    order_data["payment_method"] = res.get("payment_method", "COD")

    return {"order": order_data, "your_earning": res.get("delivery_partner_earning", 0)}


@router.post("/delivery/orders/{order_id}/pickup")
async def delivery_pickup(order_id: str, user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        raise HTTPException(404, "Register first")
    o = await db.orders.find_one({"_id": oid(order_id),
                                  "delivery_partner_id": p["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    updated = await transition_order(o, "PICKED_UP", by="delivery")
    await notify(o["customer_id"], "Order picked up", "Your food is on the way!")
    return {"order": ser(updated)}


@router.post("/delivery/orders/{order_id}/start")
async def delivery_start(order_id: str, user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        raise HTTPException(404, "Register first")
    o = await db.orders.find_one({"_id": oid(order_id),
                                  "delivery_partner_id": p["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    updated = await transition_order(o, "OUT_FOR_DELIVERY", by="delivery")
    await notify(o["customer_id"], "Out for delivery", "Arriving soon.")
    return {"order": ser(updated)}


@router.post("/delivery/orders/{order_id}/deliver")
async def delivery_deliver(order_id: str, user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        raise HTTPException(404, "Register first")
    o = await db.orders.find_one({"_id": oid(order_id),
                                  "delivery_partner_id": p["_id"]})
    if not o:
        raise HTTPException(404, "Order not found")
    updated = await transition_order(o, "DELIVERED", by="delivery",
                                   extra={"delivered_at": now()})
    await notify(o["customer_id"], "Delivered", "Enjoy your meal! Rate your order.")
    return {"order": ser(updated)}


@router.post("/delivery/orders/{order_id}/location")
async def delivery_location(order_id: str, body: LocBody,
                            user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        raise HTTPException(404, "Register first")
    await db.orders.update_one(
        {"_id": oid(order_id), "delivery_partner_id": p["_id"]},
        {"$set": {"partner_location": {"lat": body.lat, "lng": body.lng,
                                       "at": now()}}})
    await db.delivery_partners.update_one({"_id": p["_id"]},
                                        {"$set": {"lat": body.lat, "lng": body.lng}})
    return {"ok": True}


@router.get("/delivery/active")
async def delivery_active(user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        return {"orders": []}
    rows = await db.orders.find(
        {"delivery_partner_id": p["_id"],
         "status": {"$in": ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
    ).sort("created_at", -1).to_list(20)
    
    out = []
    for o in rows:
        phone, total = extract_order_details(o)
        order_dict = ser(o)
        order_dict["customer_phone"] = phone
        order_dict["customer_total"] = total
        order_dict["payment_method"] = o.get("payment_method", "COD")
        out.append(order_dict)
        
    return {"orders": out}


@router.get("/delivery/earnings")
async def delivery_earnings(user=Depends(require_roles("delivery"))):
    p = await _partner(user)
    if not p:
        return {"total_earnings": 0, "total_deliveries": 0, "today_earnings": 0,
                "today_deliveries": 0, "history": []}
    delivered = await db.orders.find(
        {"delivery_partner_id": p["_id"], "status": "DELIVERED"}).to_list(1000)
    ds = day_start()
    today = [o for o in delivered if o.get("delivered_at") and o["delivered_at"] >= ds]
    return {
        "total_earnings": sum(o.get("delivery_partner_earning", 0) for o in delivered),
        "total_deliveries": len(delivered),
        "today_earnings": sum(o.get("delivery_partner_earning", 0) for o in today),
        "today_deliveries": len(today),
        "history": [{**ser(o), "earning": o.get("delivery_partner_earning", 0)}
                    for o in delivered[-50:][::-1]],
    }


@router.get("/public/settings")
async def get_public_settings():
    settings = await get_settings()
    return {"helpline": settings.get("helpline", "9832413545")}