# """Auth primitives: OTP hashing, JWT, dependencies, RBAC."""
# import hashlib
# import hmac
# import secrets
# from datetime import timedelta
# from typing import Annotated, Optional

# import jwt
# from bson import ObjectId
# from fastapi import Depends, HTTPException, status
# from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# import config
# from db import db, now

# bearer = HTTPBearer(auto_error=False)


# def hash_secret(value: str) -> str:
#     return hmac.new(config.OTP_PEPPER, value.encode(), hashlib.sha256).hexdigest()


# def gen_otp() -> str:
#     return f"{secrets.randbelow(10 ** config.OTP_LENGTH):0{config.OTP_LENGTH}d}"


# def oid(value: str) -> ObjectId:
#     try:
#         return ObjectId(value)
#     except Exception:
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")


# def make_token(user_id: str, role: str, kind: str, lifetime: timedelta) -> str:
#     t = now()
#     return jwt.encode(
#         {
#             "sub": str(user_id),
#             "role": role,
#             "typ": kind,
#             "iss": config.JWT_ISSUER,
#             "aud": config.JWT_AUDIENCE,
#             "iat": t,
#             "nbf": t,
#             "exp": t + lifetime,
#             "jti": secrets.token_urlsafe(16),
#         },
#         config.JWT_SECRET,
#         algorithm=config.JWT_ALG,
#     )


# def decode_token(token: str, expected_type: str) -> dict:
#     try:
#         payload = jwt.decode(
#             token,
#             config.JWT_SECRET,
#             algorithms=[config.JWT_ALG],
#             issuer=config.JWT_ISSUER,
#             audience=config.JWT_AUDIENCE,
#             options={"require": ["sub", "exp", "iat", "typ"]},
#         )
#         if payload["typ"] != expected_type:
#             raise ValueError("wrong token type")
#         return payload
#     except (jwt.PyJWTError, ValueError):
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


# async def issue_session(user: dict) -> dict:
#     access = make_token(user["_id"], user["role"], "access",
#                         timedelta(minutes=config.ACCESS_TTL_MIN))
#     refresh = make_token(user["_id"], user["role"], "refresh",
#                          timedelta(days=config.REFRESH_TTL_DAYS))
#     await db.sessions.insert_one({
#         "user_id": user["_id"],
#         "refresh_hash": hash_secret(refresh),
#         "expires_at": now() + timedelta(days=config.REFRESH_TTL_DAYS),
#         "revoked_at": None,
#         "created_at": now(),
#     })
#     return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


# async def current_user(
#     creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
# ) -> dict:
#     if not creds:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
#     payload = decode_token(creds.credentials, "access")
#     user = await db.users.find_one({"_id": oid(payload["sub"])})
#     if not user:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
#     if not user.get("active", True):
#         raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended")
#     return user


# def require_roles(*roles):
#     async def dep(user: Annotated[dict, Depends(current_user)]) -> dict:
#         if user["role"] not in roles:
#             raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied for role")
#         return user
#     return dep




























# """Auth primitives: OTP hashing, JWT, dependencies, RBAC."""
# import hashlib
# import hmac
# import secrets
# from datetime import timedelta
# from typing import Annotated, Optional

# import jwt
# from bson import ObjectId
# from fastapi import Depends, HTTPException, status
# from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# import config
# from db import db, now

# bearer = HTTPBearer(auto_error=False)


# def hash_secret(value: str) -> str:
#     return hmac.new(config.OTP_PEPPER, value.encode(), hashlib.sha256).hexdigest()


# def gen_otp() -> str:
#     return f"{secrets.randbelow(10 ** config.OTP_LENGTH):0{config.OTP_LENGTH}d}"


# def oid(value: str) -> ObjectId:
#     try:
#         return ObjectId(value)
#     except Exception:
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")


# def make_token(user_id: str, role: str, kind: str, lifetime: timedelta) -> str:
#     t = now()
#     return jwt.encode(
#         {
#             "sub": str(user_id),
#             "role": role,
#             "typ": kind,
#             "iss": config.JWT_ISSUER,
#             "aud": config.JWT_AUDIENCE,
#             "iat": t,
#             "nbf": t,
#             "exp": t + lifetime,
#             "jti": secrets.token_urlsafe(16),
#         },
#         config.JWT_SECRET,
#         algorithm=config.JWT_ALG,
#     )


# def decode_token(token: str, expected_type: str) -> dict:
#     try:
#         payload = jwt.decode(
#             token,
#             config.JWT_SECRET,
#             algorithms=[config.JWT_ALG],
#             issuer=config.JWT_ISSUER,
#             audience=config.JWT_AUDIENCE,
#             options={"require": ["sub", "exp", "iat", "typ"]},
#         )
#         if payload["typ"] != expected_type:
#             raise ValueError("wrong token type")
#         return payload
#     except (jwt.PyJWTError, ValueError):
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


# async def issue_session(user: dict) -> dict:
#     access = make_token(user["_id"], user["role"], "access",
#                         timedelta(minutes=config.ACCESS_TTL_MIN))
#     refresh = make_token(user["_id"], user["role"], "refresh",
#                          timedelta(days=config.REFRESH_TTL_DAYS))
#     await db.sessions.insert_one({
#         "user_id": user["_id"],
#         "refresh_hash": hash_secret(refresh),
#         "expires_at": now() + timedelta(days=config.REFRESH_TTL_DAYS),
#         "revoked_at": None,
#         "created_at": now(),
#     })
#     return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


# async def current_user(
#     creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
# ) -> dict:
#     if not creds:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
#     payload = decode_token(creds.credentials, "access")
    
#     sub = payload["sub"]
#     user = None

#     # 1. Try finding by BSON ObjectId
#     try:
#         user = await db.users.find_one({"_id": ObjectId(sub)})
#     except Exception:
#         pass

#     # 2. Try finding by string _id
#     if not user:
#         user = await db.users.find_one({"_id": sub})

#     # 3. Try finding by custom 'id' field (e.g., UUID string)
#     if not user:
#         user = await db.users.find_one({"id": sub})

#     if not user:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
#     if not user.get("active", True):
#         raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended")
#     return user


# def require_roles(*roles):
#     async def dep(user: Annotated[dict, Depends(current_user)]) -> dict:
#         user_role = str(user.get("role", "")).strip().lower()
#         allowed_roles = [str(r).strip().lower() for r in roles]

#         if user_role not in allowed_roles:
#             raise HTTPException(
#                 status.HTTP_403_FORBIDDEN, 
#                 f"Access denied for role: '{user.get('role')}'"
#             )
#         return user
#     return dep




























"""Auth primitives: OTP hashing, JWT, dependencies, RBAC."""
import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Annotated, Optional

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import config
from db import db, now

bearer = HTTPBearer(auto_error=False)


def hash_secret(value: str) -> str:
    return hmac.new(config.OTP_PEPPER, value.encode(), hashlib.sha256).hexdigest()


def gen_otp() -> str:
    return f"{secrets.randbelow(10 ** config.OTP_LENGTH):0{config.OTP_LENGTH}d}"


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")


def make_token(user_id: str, role: str, kind: str, lifetime: timedelta) -> str:
    t = now()
    return jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "typ": kind,
            "iss": config.JWT_ISSUER,
            "aud": config.JWT_AUDIENCE,
            "iat": t,
            "nbf": t,
            "exp": t + lifetime,
            "jti": secrets.token_urlsafe(16),
        },
        config.JWT_SECRET,
        algorithm=config.JWT_ALG,
    )


# Compatibility wrappers for routes_admin.py
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    sub = data.get("sub", "")
    role = data.get("role", "admin")
    ttl = expires_delta or timedelta(minutes=config.ACCESS_TTL_MIN)
    return make_token(sub, role, "access", ttl)


def create_refresh_token(data: dict) -> str:
    sub = data.get("sub", "")
    role = data.get("role", "admin")
    return make_token(sub, role, "refresh", timedelta(days=config.REFRESH_TTL_DAYS))


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALG],
            issuer=config.JWT_ISSUER,
            audience=config.JWT_AUDIENCE,
            options={"require": ["sub", "exp", "iat", "typ"]},
        )
        if payload["typ"] != expected_type:
            raise ValueError("wrong token type")
        return payload
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


async def issue_session(user: dict) -> dict:
    access = make_token(user["_id"], user["role"], "access",
                        timedelta(minutes=config.ACCESS_TTL_MIN))
    refresh = make_token(user["_id"], user["role"], "refresh",
                         timedelta(days=config.REFRESH_TTL_DAYS))
    await db.sessions.insert_one({
        "user_id": user["_id"],
        "refresh_hash": hash_secret(refresh),
        "expires_at": now() + timedelta(days=config.REFRESH_TTL_DAYS),
        "revoked_at": None,
        "created_at": now(),
    })
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


async def current_user(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
) -> dict:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    payload = decode_token(creds.credentials, "access")
    
    sub = payload["sub"]
    user = None

    # 1. Try finding by BSON ObjectId
    try:
        user = await db.users.find_one({"_id": ObjectId(sub)})
    except Exception:
        pass

    # 2. Try finding by string _id
    if not user:
        user = await db.users.find_one({"_id": sub})

    # 3. Try finding by custom 'id' field (e.g., UUID string)
    if not user:
        user = await db.users.find_one({"id": sub})

    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if not user.get("active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended")
    return user


def require_roles(*roles):
    async def dep(user: Annotated[dict, Depends(current_user)]) -> dict:
        user_role = str(user.get("role", "")).strip().lower()
        allowed_roles = [str(r).strip().lower() for r in roles]

        if user_role not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, 
                f"Access denied for role: '{user.get('role')}'"
            )
        return user
    return dep