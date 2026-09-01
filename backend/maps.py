"""Google Maps Routes API integration. Backend is authoritative for billing distance.

Uses the Google Routes API (computeRoutes) to get real road distance/duration and an
encoded polyline between two points. Falls back to Haversine straight-line distance when
the API key is missing or the provider is unavailable, so ordering never breaks.
"""
import logging
from typing import Optional

import httpx

import config
import finance

logger = logging.getLogger("bitego.maps")

ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

_client: Optional[httpx.AsyncClient] = None


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=3.0))
    return _client


async def aclose():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def get_route(o_lat: float, o_lng: float, d_lat: float, d_lng: float) -> dict:
    """Return authoritative road route between two coordinates.

    Result: {distance_km, duration_seconds, polyline, source}
    `source` is "google" when Routes API succeeded, else "haversine".
    """
    fallback = {
        "distance_km": finance.haversine_km(o_lat, o_lng, d_lat, d_lng),
        "duration_seconds": None,
        "polyline": None,
        "source": "haversine",
    }
    key = config.GOOGLE_MAPS_SERVER_KEY
    if not key:
        return fallback

    body = {
        "origin": {"location": {"latLng": {"latitude": o_lat, "longitude": o_lng}}},
        "destination": {"location": {"latLng": {"latitude": d_lat, "longitude": d_lng}}},
        "travelMode": "TWO_WHEELER",
        "routingPreference": "TRAFFIC_UNAWARE",
        "computeAlternativeRoutes": False,
        "polylineQuality": "OVERVIEW",
        "languageCode": "en-US",
        "units": "METRIC",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": (
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
        ),
    }
    try:
        r = await _http().post(ROUTES_URL, json=body, headers=headers)
        r.raise_for_status()
        data = r.json()
        routes = data.get("routes", [])
        if not routes:
            return fallback
        route = routes[0]
        meters = route.get("distanceMeters")
        if not meters:
            return fallback
        dur = route.get("duration", "")
        seconds = int(dur[:-1]) if isinstance(dur, str) and dur.endswith("s") else None
        return {
            "distance_km": round(meters / 1000.0, 3),
            "duration_seconds": seconds,
            "polyline": route.get("polyline", {}).get("encodedPolyline"),
            "source": "google",
        }
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        logger.warning("Routes API failed, using haversine fallback: %s", exc)
        return fallback
