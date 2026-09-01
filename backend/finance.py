"""Distance & authoritative financial calculations. Backend is source of truth."""
import math
from typing import List


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
