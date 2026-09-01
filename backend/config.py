"""BiteGo backend configuration & environment."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_ISSUER = "bitego-api"
JWT_AUDIENCE = "bitego-apps"
ACCESS_TTL_MIN = 60 * 24          # 1 day access token
REFRESH_TTL_DAYS = 60             # long-lived persistent session

OTP_PEPPER = os.environ["OTP_PEPPER"].encode()
OTP_TTL_SEC = 300                 # 5 min
OTP_RESEND_COOLDOWN_SEC = 60
OTP_MAX_ATTEMPTS = 5
OTP_LENGTH = 6

ENV = os.getenv("ENV", "development")
IS_DEV = ENV == "development"
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "dev")

FIRST_ADMIN_EMAIL = os.getenv("FIRST_ADMIN_EMAIL")
FIRST_ADMIN_PASSWORD = os.getenv("FIRST_ADMIN_PASSWORD")

# Google Maps server key (Routes API). Never exposed to clients.
GOOGLE_MAPS_SERVER_KEY = os.getenv("GOOGLE_MAPS_SERVER_KEY", "")

ROLES = ("customer", "restaurant", "delivery", "admin")

# ---- Default business settings (seeded once, then Admin-controlled in DB) ----
DEFAULT_SETTINGS = {
    "_id": "global",
    "platform_charge": 7,
    "restaurant_commission_pct": 0,
    "restaurant_fixed_fee": 0,
    "delivery_base_first_km": 19,
    "delivery_additional_per_km": 8,
    "delivery_partner_earning_slabs": [
        {"km": 1, "earning": 15},
        {"km": 2, "earning": 19},
        {"km": 3, "earning": 28},
        {"km": 4, "earning": 35},
        {"km": 5, "earning": 42},
    ],
    "max_service_radius_km": 10,
    "priority_radius_km": 5,
    "ordering_enabled": True,
    "helpline": "9832413545",
}



















