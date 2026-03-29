from flask import Blueprint

from app.database import db
from app.models import User
from app.utils import (
    check_password,
    generate_token,
    get_json_body,
    hash_password,
    is_valid_email,
    require_fields,
)


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = get_json_body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    full_name = str(data.get("full_name", "")).strip()
    phone = str(data.get("phone", "")).strip()

    require_fields(data, ["email", "password", "full_name"])
    if not is_valid_email(email):
        return {"error": "Invalid email"}, 400
    if User.query.filter_by(email=email).first():
        return {"error": "Email already exists"}, 409

    user = User(
        email=email,
        full_name=full_name,
        phone=phone,
        password_hash=hash_password(password),
        role="USER",
    )
    db.session.add(user)
    db.session.commit()
    return {"message": "Register success", "user_id": user.id}, 201


@auth_bp.post("/login")
def login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email).first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid credentials"}, 401
    if not user.is_active:
        return {"error": "Account is locked"}, 403

    token = generate_token({"user_id": user.id, "role": user.role}, expires_minutes=60 * 24)
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }, 200


@auth_bp.post("/seller-login")
def seller_login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email, role="SELLER").first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid seller credentials"}, 401
    if not user.is_active:
        return {"error": "Seller account is locked"}, 403

    token = generate_token({"user_id": user.id, "role": user.role}, expires_minutes=60 * 24)
    return {"access_token": token}, 200


@auth_bp.post("/admin-login")
def admin_login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email, role="ADMIN").first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid admin credentials"}, 401
    if not user.is_active:
        return {"error": "Admin account is locked"}, 403

    token = generate_token({"user_id": user.id, "role": user.role}, expires_minutes=60 * 24)
    return {"access_token": token}, 200
