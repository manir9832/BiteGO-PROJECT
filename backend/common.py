# """Shared helpers, constants and the order state machine used across routers."""
# from datetime import datetime, timedelta, timezone
# from typing import Optional

# from bson import ObjectId
# from fastapi import HTTPException

# from db import db, now
# from security import oid

# ORDER_FLOW = {
#     "PLACED": ["ACCEPTED", "REJECTED", "CANCELLED"],
#     "ACCEPTED": ["PREPARING", "CANCELLED"],
#     "PREPARING": ["READY", "CANCELLED"],
#     "READY": ["ASSIGNED", "CANCELLED"],
#     "ASSIGNED": ["PICKED_UP", "CANCELLED"],
#     "PICKED_UP": ["OUT_FOR_DELIVERY"],
#     "OUT_FOR_DELIVERY": ["DELIVERED"],
#     "DELIVERED": [],
#     "REJECTED": [],
#     "CANCELLED": [],
# }
# ACTIVE_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "ASSIGNED",
#                    "PICKED_UP", "OUT_FOR_DELIVERY"]
# RESTAURANT_ACCEPT_TIMEOUT_MIN = 10

# _HIDDEN_KEYS = {"password_hash", "otp_hash", "refresh_hash"}


# def ser(doc):
#     if doc is None:
#         return None
#     if isinstance(doc, list):
#         return [ser(d) for d in doc]
#     if isinstance(doc, dict):
#         out = {}
#         for k, v in doc.items():
#             if k in _HIDDEN_KEYS:
#                 continue
#             out["id" if k == "_id" else k] = ser(v)
#         return out
#     if isinstance(doc, ObjectId):
#         return str(doc)
#     if isinstance(doc, datetime):
#         return doc.astimezone(timezone.utc).isoformat()
#     return doc


# def norm_phone(phone: str) -> str:
#     digits = "".join(c for c in phone if c.isdigit())
#     if len(digits) < 10:
#         raise HTTPException(400, "Enter a valid mobile number")
#     return digits[-10:]


# async def notify(user_id, title, body, type_="order", data=None):
#     if user_id is None:
#         return
#     await db.notifications.insert_one({
#         "user_id": user_id if isinstance(user_id, ObjectId) else oid(str(user_id)),
#         "title": title, "body": body, "type": type_, "data": data or {},
#         "read": False, "created_at": now(),
#     })


# async def audit(admin, action, target=None, meta=None):
#     await db.audit_logs.insert_one({
#         "admin_id": admin["_id"], "admin_email": admin.get("email"),
#         "action": action, "target": target, "meta": meta or {}, "at": now(),
#     })


# async def transition_order(order, new_status, by="system", reason=None, extra=None):
#     cur = order["status"]
#     if new_status not in ORDER_FLOW.get(cur, []):
#         raise HTTPException(409, f"Cannot move order from {cur} to {new_status}")
#     update = {"status": new_status, "updated_at": now()}
#     if extra:
#         update.update(extra)
#     if reason:
#         update["cancellation_reason"] = reason
#     await db.orders.update_one(
#         {"_id": order["_id"], "status": cur},
#         {"$set": update,
#          "$push": {"timeline": {"status": new_status, "at": now(),
#                                 "by": by, "reason": reason}}})
#     return await db.orders.find_one({"_id": order["_id"]})























# """Shared helpers, constants and the order state machine used across routers."""
# from datetime import datetime, timedelta, timezone
# from typing import Optional
# import httpx

# from bson import ObjectId
# from fastapi import HTTPException

# from db import db, now
# from security import oid

# ORDER_FLOW = {
#     "PLACED": ["ACCEPTED", "REJECTED", "CANCELLED"],
#     "ACCEPTED": ["PREPARING", "CANCELLED"],
#     "PREPARING": ["READY", "CANCELLED"],
#     "READY": ["ASSIGNED", "CANCELLED"],
#     "ASSIGNED": ["PICKED_UP", "CANCELLED"],
#     "PICKED_UP": ["OUT_FOR_DELIVERY"],
#     "OUT_FOR_DELIVERY": ["DELIVERED"],
#     "DELIVERED": [],
#     "REJECTED": [],
#     "CANCELLED": [],
# }
# ACTIVE_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "ASSIGNED",
#                    "PICKED_UP", "OUT_FOR_DELIVERY"]
# RESTAURANT_ACCEPT_TIMEOUT_MIN = 10

# _HIDDEN_KEYS = {"password_hash", "otp_hash", "refresh_hash"}


# def ser(doc):
#     if doc is None:
#         return None
#     if isinstance(doc, list):
#         return [ser(d) for d in doc]
#     if isinstance(doc, dict):
#         out = {}
#         for k, v in doc.items():
#             if k in _HIDDEN_KEYS:
#                 continue
#             out["id" if k == "_id" else k] = ser(v)
#         return out
#     if isinstance(doc, ObjectId):
#         return str(doc)
#     if isinstance(doc, datetime):
#         return doc.astimezone(timezone.utc).isoformat()
#     return doc


# def norm_phone(phone: str) -> str:
#     digits = "".join(c for c in phone if c.isdigit())
#     if len(digits) < 10:
#         raise HTTPException(400, "Enter a valid mobile number")
#     return digits[-10:]


# async def notify(user_id, title, body, type_="order", data=None):
#     if user_id is None:
#         return
    
#     u_id = user_id if isinstance(user_id, ObjectId) else oid(str(user_id))
    
#     # ১. ডাটাবেজের নোটিফিকেশন কালেকশনে সেভ করা
#     await db.notifications.insert_one({
#         "user_id": u_id,
#         "title": title, "body": body, "type": type_, "data": data or {},
#         "read": False, "created_at": now(),
#     })

#     # ২. ইউজারের অ্যাকাউন্ট থেকে এক্সপো পুশ টোকেন খোঁজা এবং পুশ নোটিফিকেশন পাঠানো
#     user = await db.users.find_one({"_id": u_id})
#     if user and user.get("push_token"):
#         push_token = user["push_token"]
#         payload = {
#             "to": push_token,
#             "sound": "default",
#             "title": title,
#             "body": body,
#             "data": data or {},
#         }
#         try:
#             async with httpx.AsyncClient() as client:
#                 await client.post(
#                     "https://exp.host/--/api/v2/push/send",
#                     json=payload,
#                     headers={
#                         "Accept": "application/json",
#                         "Accept-encoding": "gzip, deflate",
#                         "Content-Type": "application/json",
#                     }
#                 )
#         except Exception as e:
#             print(f"Error sending push notification: {e}")


# async def audit(admin, action, target=None, meta=None):
#     await db.audit_logs.insert_one({
#         "admin_id": admin["_id"], "admin_email": admin.get("email"),
#         "action": action, "target": target, "meta": meta or {}, "at": now(),
#     })


# async def transition_order(order, new_status, by="system", reason=None, extra=None):
#     cur = order["status"]
#     if new_status not in ORDER_FLOW.get(cur, []):
#         raise HTTPException(409, f"Cannot move order from {cur} to {new_status}")
#     update = {"status": new_status, "updated_at": now()}
#     if extra:
#         update.update(extra)
#     if reason:
#         update["cancellation_reason"] = reason
#     await db.orders.update_one(
#         {"_id": order["_id"], "status": cur},
#         {"$set": update,
#          "$push": {"timeline": {"status": new_status, "at": now(),
#                                 "by": by, "reason": reason}}})
#     return await db.orders.find_one({"_id": order["_id"]})

















"""Shared helpers, constants and the order state machine used across routers."""
from datetime import datetime, timedelta, timezone
from typing import Optional
import httpx

from bson import ObjectId
from fastapi import HTTPException

from db import db, now
from security import oid

ORDER_FLOW = {
    "PLACED": ["ACCEPTED", "REJECTED", "CANCELLED"],
    "ACCEPTED": ["PREPARING", "CANCELLED"],
    "PREPARING": ["READY", "CANCELLED"],
    "READY": ["ASSIGNED", "CANCELLED"],
    "ASSIGNED": ["PICKED_UP", "CANCELLED"],
    "PICKED_UP": ["OUT_FOR_DELIVERY"],
    "OUT_FOR_DELIVERY": ["DELIVERED"],
    "DELIVERED": [],
    "REJECTED": [],
    "CANCELLED": [],
}
ACTIVE_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "ASSIGNED",
                   "PICKED_UP", "OUT_FOR_DELIVERY"]
RESTAURANT_ACCEPT_TIMEOUT_MIN = 10

_HIDDEN_KEYS = {"password_hash", "otp_hash", "refresh_hash"}


def ser(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [ser(d) for d in doc]
    if isinstance(doc, dict):
        out = {}
        for k, v in doc.items():
            if k in _HIDDEN_KEYS:
                continue
            out["id" if k == "_id" else k] = ser(v)
        return out
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.astimezone(timezone.utc).isoformat()
    return doc


def norm_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 10:
        raise HTTPException(400, "Enter a valid mobile number")
    return digits[-10:]


async def notify(user_id, title, body, type_="order", data=None):
    if user_id is None:
        return
    
    u_id = user_id if isinstance(user_id, ObjectId) else oid(str(user_id))
    
    # ১. ডাটাবেজের নোটিফিকেশন কালেকশনে সেভ করা
    await db.notifications.insert_one({
        "user_id": u_id,
        "title": title, "body": body, "type": type_, "data": data or {},
        "read": False, "created_at": now(),
    })

    # ২. ইউজারের অ্যাকাউন্ট থেকে এক্সপো পুশ টোকেন খোঁজা এবং পুশ নোটিফিকেশন পাঠানো
    user = await db.users.find_one({"_id": u_id})
    if user and user.get("push_token"):
        push_token = user["push_token"]
        payload = {
            "to": push_token,
            "sound": "default",
            "priority": "high",  # স্ক্রিন অফ বা লক থাকা অবস্থায় নোটিফিকেশন জাগানোর জন্য এটি যুক্ত করা হলো
            "title": title,
            "body": body,
            "data": data or {},
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=payload,
                    headers={
                        "Accept": "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    }
                )
        except Exception as e:
            print(f"Error sending push notification: {e}")


async def audit(admin, action, target=None, meta=None):
    await db.audit_logs.insert_one({
        "admin_id": admin["_id"], "admin_email": admin.get("email"),
        "action": action, "target": target, "meta": meta or {}, "at": now(),
    })


async def transition_order(order, new_status, by="system", reason=None, extra=None):
    cur = order["status"]
    if new_status not in ORDER_FLOW.get(cur, []):
        raise HTTPException(409, f"Cannot move order from {cur} to {new_status}")
    update = {"status": new_status, "updated_at": now()}
    if extra:
        update.update(extra)
    if reason:
        update["cancellation_reason"] = reason
    await db.orders.update_one(
        {"_id": order["_id"], "status": cur},
        {"$set": update,
         "$push": {"timeline": {"status": new_status, "at": now(),
                                "by": by, "reason": reason}}})
    return await db.orders.find_one({"_id": order["_id"]})