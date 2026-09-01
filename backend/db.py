"""MongoDB connection, indexes, and default document seeding."""
import logging
from datetime import datetime, timezone

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

import config

logger = logging.getLogger("bitego.db")

client = AsyncIOMotorClient(config.MONGO_URL, tz_aware=True, tzinfo=timezone.utc)
db = client[config.DB_NAME]


def now() -> datetime:
    return datetime.now(timezone.utc)


async def ensure_indexes():
    await db.users.create_index("phone", sparse=True)
    await db.users.create_index([("phone", 1), ("role", 1)], unique=True, sparse=True)
    await db.users.create_index("email", unique=True, sparse=True)
    await db.otp_challenges.create_index("expires_at", expireAfterSeconds=3600)
    await db.sessions.create_index("refresh_hash", unique=True)
    await db.restaurants.create_index([("location", "2dsphere")])
    await db.restaurants.create_index("service_area_id")
    await db.foods.create_index("restaurant_id")
    await db.orders.create_index("customer_id")
    await db.orders.create_index("restaurant_id")
    await db.orders.create_index("delivery_partner_id")
    await db.orders.create_index("status")
    await db.orders.create_index("created_at")
    await db.service_areas.create_index([("center", "2dsphere")])
    await db.addresses.create_index("customer_id")
    await db.favorites.create_index([("customer_id", 1), ("kind", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.reviews.create_index("restaurant_id")


async def ensure_defaults():
    existing = await db.business_settings.find_one({"_id": "global"})
    if not existing:
        await db.business_settings.insert_one(dict(config.DEFAULT_SETTINGS))
        logger.info("Seeded default business settings")

    if config.FIRST_ADMIN_EMAIL and config.FIRST_ADMIN_PASSWORD:
        admin = await db.users.find_one({"role": "admin"})
        if not admin:
            pw_hash = bcrypt.hashpw(
                config.FIRST_ADMIN_PASSWORD.encode(), bcrypt.gensalt()
            ).decode()
            await db.users.insert_one({
                "email": config.FIRST_ADMIN_EMAIL.lower().strip(),
                "password_hash": pw_hash,
                "role": "admin",
                "name": "BiteGo Admin",
                "active": True,
                "created_at": now(),
            })
            logger.info("Created first admin: %s", config.FIRST_ADMIN_EMAIL)


async def get_settings() -> dict:
    s = await db.business_settings.find_one({"_id": "global"})
    if not s:
        s = dict(config.DEFAULT_SETTINGS)
        await db.business_settings.insert_one(s)
    return s
