import datetime
import os
from functools import wraps

import jwt
from flask import g, request
from werkzeug.security import check_password_hash, generate_password_hash


def generate_token(payload: dict, expires_minutes: int = 60) -> str:
    secret = os.getenv("JWT_SECRET", "dev-secret")
    data = payload.copy()
    data["exp"] = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_minutes)
    return jwt.encode(data, secret, algorithm="HS256")


def verify_token(token: str) -> dict:
    secret = os.getenv("JWT_SECRET", "dev-secret")
    return jwt.decode(token, secret, algorithms=["HS256"])


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def check_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def is_valid_email(email: str) -> bool:
    return "@" in email and "." in email


def get_token_from_request() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return ""
    return auth_header.replace("Bearer ", "", 1).strip()


def get_json_body() -> dict:
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        return data
    return {}


def require_fields(data: dict, fields: list[str]):
    missing = [field for field in fields if not str(data.get(field, "")).strip()]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")


def parse_int(value, field_name: str, minimum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be an integer")
    if minimum is not None and parsed < minimum:
        raise ValueError(f"{field_name} must be >= {minimum}")
    return parsed


def parse_float(value, field_name: str, minimum: float | None = None) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if minimum is not None and parsed < minimum:
        raise ValueError(f"{field_name} must be >= {minimum}")
    return parsed


def auth_required(roles=None):
    roles = roles or []

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            token = get_token_from_request()
            if not token:
                return {"error": "Missing bearer token"}, 401

            try:
                payload = verify_token(token)
            except Exception:
                return {"error": "Invalid or expired token"}, 401

            user_role = payload.get("role")
            if roles and user_role not in roles:
                return {"error": "Forbidden"}, 403

            g.current_user_id = payload.get("user_id")
            g.current_user_role = user_role
            return func(*args, **kwargs)

        return wrapper

    return decorator
