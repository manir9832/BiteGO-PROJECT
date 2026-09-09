# """Distance & authoritative financial calculations. Backend is source of truth."""
# import math
# from typing import List


# def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
#     r = 6371.0
#     p1, p2 = math.radians(lat1), math.radians(lat2)
#     dphi = math.radians(lat2 - lat1)
#     dlmb = math.radians(lon2 - lon1)
#     a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
#     return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 3)


# def customer_delivery_charge(distance_km: float, settings: dict) -> int:
#     """First 1 KM = base; every additional STARTED km adds `additional`."""
#     base = settings["delivery_base_first_km"]
#     additional = settings["delivery_additional_per_km"]
#     if distance_km <= 1:
#         return int(base)
#     extra_km = math.ceil(distance_km - 1)
#     return int(base + extra_km * additional)


# def partner_earning(distance_km: float, settings: dict) -> int:
#     """Delivery Partner earning from Admin-configured slabs. NEVER derived from
#     the customer delivery charge."""
#     slabs = sorted(settings["delivery_partner_earning_slabs"], key=lambda x: x["km"])
#     if not slabs:
#         return 0
#     n = max(1, math.ceil(distance_km))
#     for slab in slabs:
#         if slab["km"] >= n:
#             return int(slab["earning"])
#     # Beyond the largest configured slab -> extrapolate by last increment.
#     last = slabs[-1]
#     if len(slabs) >= 2:
#         inc = slabs[-1]["earning"] - slabs[-2]["earning"]
#     else:
#         inc = last["earning"]
#     return int(last["earning"] + (n - last["km"]) * inc)


# def compute_totals(items: List[dict], distance_km: float, settings: dict,
#                    commission_pct: float, fixed_fee: float) -> dict:
#     """Returns an authoritative, snapshot-ready financial breakdown."""
#     subtotal = sum(int(i["price"]) * int(i["quantity"]) for i in items)
#     platform_charge = int(settings["platform_charge"])
#     delivery_charge = customer_delivery_charge(distance_km, settings)
#     earning = partner_earning(distance_km, settings)
#     commission_amount = round(subtotal * float(commission_pct) / 100.0, 2)
#     fixed_fee = float(fixed_fee)

#     customer_total = subtotal + platform_charge + delivery_charge
#     restaurant_net = round(subtotal - commission_amount - fixed_fee, 2)
#     bitego_delivery_margin = delivery_charge - earning

#     return {
#         "distance_km": round(distance_km, 3),
#         "food_subtotal": subtotal,
#         "platform_charge": platform_charge,
#         "customer_delivery_charge": delivery_charge,
#         "delivery_partner_earning": earning,
#         "restaurant_commission_pct": float(commission_pct),
#         "restaurant_commission_amount": commission_amount,
#         "restaurant_fixed_fee": fixed_fee,
#         "restaurant_net_payable": restaurant_net,
#         "bitego_delivery_margin": bitego_delivery_margin,
#         "customer_total": customer_total,
#     }

































































































"""Distance & authoritative financial calculations. Backend is source of truth."""
import math
from datetime import datetime, timedelta, timezone
from typing import List
from db import db


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 3)


def customer_delivery_charge(distance_km: float, settings: dict) -> int:
    """First 1 KM = base; every additional STARTED km adds `additional`."""
    base = settings["delivery_base_first_km"]
    additional = settings["delivery_additional_per_km"]
    if distance_km <= 1:
        return int(base)
    extra_km = math.ceil(distance_km - 1)
    return int(base + extra_km * additional)


def partner_earning(distance_km: float, settings: dict) -> int:
    """Delivery Partner earning from Admin-configured slabs. NEVER derived from
    the customer delivery charge."""
    slabs = sorted(settings["delivery_partner_earning_slabs"], key=lambda x: x["km"])
    if not slabs:
        return 0
    n = max(1, math.ceil(distance_km))
    for slab in slabs:
        if slab["km"] >= n:
            return int(slab["earning"])
    # Beyond the largest configured slab -> extrapolate by last increment.
    last = slabs[-1]
    if len(slabs) >= 2:
        inc = slabs[-1]["earning"] - slabs[-2]["earning"]
    else:
        inc = last["earning"]
    return int(last["earning"] + (n - last["km"]) * inc)


def compute_totals(items: List[dict], distance_km: float, settings: dict,
                    commission_pct: float, fixed_fee: float) -> dict:
    """Returns an authoritative, snapshot-ready financial breakdown."""
    subtotal = sum(int(i["price"]) * int(i["quantity"]) for i in items)
    platform_charge = int(settings["platform_charge"])
    delivery_charge = customer_delivery_charge(distance_km, settings)
    earning = partner_earning(distance_km, settings)
    commission_amount = round(subtotal * float(commission_pct) / 100.0, 2)
    fixed_fee = float(fixed_fee)

    customer_total = subtotal + platform_charge + delivery_charge
    restaurant_net = round(subtotal - commission_amount - fixed_fee, 2)
    bitego_delivery_margin = delivery_charge - earning

    return {
        "distance_km": round(distance_km, 3),
        "food_subtotal": subtotal,
        "platform_charge": platform_charge,
        "customer_delivery_charge": delivery_charge,
        "delivery_partner_earning": earning,
        "restaurant_commission_pct": float(commission_pct),
        "restaurant_commission_amount": commission_amount,
        "restaurant_fixed_fee": fixed_fee,
        "restaurant_net_payable": restaurant_net,
        "bitego_delivery_margin": bitego_delivery_margin,
        "customer_total": customer_total,
    }


# ==========================================
# NEW: Daily, Weekly Settlements & Payouts Logic
# ==========================================

async def get_restaurant_settlements():
    """রেস্টুরেন্ট অনুযায়ী Daily, Weekly এবং Remaining পেমেন্ট হিসাব করা"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    restaurants_cursor = db.restaurants.find({})
    restaurants = await restaurants_cursor.to_list(length=None)
    
    result = []
    for rest in restaurants:
        rest_id = str(rest["_id"])
        
        # ডেলিভারি হয়ে যাওয়া এবং আনসেটেলড অর্ডারগুলো ফেচ করা
        orders_cursor = db.orders.find({"restaurant_id": rest_id, "status": "delivered"})
        orders = await orders_cursor.to_list(length=None)
        
        daily_earnings = 0
        weekly_earnings = 0
        remaining = 0
        total_orders = 0
        
        for order in orders:
            if not order.get("is_settled", False):
                total_orders += 1
                # রেস্টুরেন্টের প্রাপ্য নেট অ্যামাউন্ট বা ফুড সাবটোটাল
                amount = order.get("restaurant_net_payable", order.get("food_subtotal", 0))
                remaining += amount
                
                order_date = order.get("created_at")
                if order_date:
                    if order_date >= today_start:
                        daily_earnings += amount
                    if order_date >= week_start:
                        weekly_earnings += amount

        result.append({
            "id": rest_id,
            "name": rest.get("name"),
            "orders_count": total_orders,
            "daily_earnings": round(daily_earnings, 2),
            "weekly_earnings": round(weekly_earnings, 2),
            "remaining": round(remaining, 2)
        })
    return result


async def settle_restaurant(restaurant_id: str):
    """অ্যাডমিন পে বাটন চাপলে রেস্টুরেন্টের সব বকেয়া সেটেল হয়ে ব্যালেন্স 0 হয়ে যাবে"""
    await db.orders.update_many(
        {"restaurant_id": restaurant_id, "status": "delivered", "is_settled": {"$ne": True}},
        {"$set": {"is_settled": True, "settled_at": datetime.now(timezone.utc)}}
    )
    return {"status": "success", "message": "Restaurant payment settled and reset to 0"}


async def get_delivery_partner_settlements():
    """ডেলিভারি পার্টনার অনুযায়ী Daily, Weekly এবং Remaining আর্নিংস হিসাব করা"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    partners_cursor = db.users.find({"role": "delivery"})
    partners = await partners_cursor.to_list(length=None)
    
    result = []
    for partner in partners:
        partner_id = str(partner["_id"])
        
        orders_cursor = db.orders.find({"delivery_partner_id": partner_id, "status": "delivered"})
        orders = await orders_cursor.to_list(length=None)
        
        daily_earnings = 0
        weekly_earnings = 0
        remaining = 0
        total_deliveries = 0
        
        for order in orders:
            if not order.get("partner_settled", False):
                total_deliveries += 1
                earning = order.get("delivery_partner_earning", 0)
                remaining += earning
                
                order_date = order.get("created_at")
                if order_date:
                    if order_date >= today_start:
                        daily_earnings += earning
                    if order_date >= week_start:
                        weekly_earnings += earning

        result.append({
            "id": partner_id,
            "name": partner.get("name", "Delivery Partner"),
            "deliveries_count": total_deliveries,
            "daily_earnings": round(daily_earnings, 2),
            "weekly_earnings": round(weekly_earnings, 2),
            "remaining": round(remaining, 2)
        })
    return result


async def settle_delivery_partner(partner_id: str):
    """ডেলিভারি পার্টনারের পেমেন্ট ক্লিয়ার করে ব্যালেন্স 0 করে দেওয়া"""
    await db.orders.update_many(
        {"delivery_partner_id": partner_id, "status": "delivered", "partner_settled": {"$ne": True}},
        {"$set": {"partner_settled": True, "partner_settled_at": datetime.now(timezone.utc)}}
    )
    return {"status": "success", "message": "Delivery partner payment settled and reset to 0"}