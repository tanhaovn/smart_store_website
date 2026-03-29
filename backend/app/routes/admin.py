from flask import Blueprint

from app.database import db
from app.models import Order, PaymentTransaction, Product, User
from app.utils import auth_required, get_json_body, hash_password, require_fields


admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/")
@auth_required(["ADMIN"])
def admin_home():
    return {"message": "ADMIN API"}, 200


@admin_bp.get("/users")
@auth_required(["ADMIN"])
def list_users():
    users = User.query.order_by(User.id.desc()).all()
    return {
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
            }
            for u in users
        ]
    }, 200


@admin_bp.post("/sellers")
@auth_required(["ADMIN"])
def create_seller():
    data = get_json_body()
    require_fields(data, ["email", "full_name", "password"])
    email = str(data.get("email", "")).strip().lower()
    full_name = str(data.get("full_name", "")).strip()
    password = str(data.get("password", "")).strip()
    phone = str(data.get("phone", "")).strip()

    if User.query.filter_by(email=email).first():
        return {"error": "Email already exists"}, 409

    seller = User(
        email=email,
        full_name=full_name,
        phone=phone,
        password_hash=hash_password(password),
        role="SELLER",
        is_active=True,
    )
    db.session.add(seller)
    db.session.commit()
    return {"message": "Seller account created", "seller_id": seller.id}, 201


@admin_bp.patch("/users/<int:user_id>/lock")
@auth_required(["ADMIN"])
def lock_or_unlock_user(user_id: int):
    data = get_json_body()
    is_active = bool(data.get("is_active", True))
    user = User.query.get_or_404(user_id)
    user.is_active = is_active
    db.session.commit()
    return {"message": "User status updated", "is_active": user.is_active}, 200


@admin_bp.patch("/users/<int:user_id>/role")
@auth_required(["ADMIN"])
def update_user_role(user_id: int):
    data = get_json_body()
    require_fields(data, ["role"])
    role = str(data.get("role", "")).strip().upper()
    allowed_roles = {"USER", "SELLER", "DELIVERY", "ADMIN"}
    if role not in allowed_roles:
        return {"error": f"role must be one of {sorted(allowed_roles)}"}, 400

    user = User.query.get_or_404(user_id)
    user.role = role
    db.session.commit()
    return {"message": "User role updated", "user_id": user.id, "role": user.role}, 200


@admin_bp.get("/products/pending")
@auth_required(["ADMIN"])
def pending_products():
    products = Product.query.filter_by(is_approved=False).order_by(Product.id.desc()).all()
    return {
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "seller_id": p.seller_id,
                "price": p.price,
            }
            for p in products
        ]
    }, 200


@admin_bp.patch("/products/<int:product_id>/approve")
@auth_required(["ADMIN"])
def approve_product(product_id: int):
    data = get_json_body()
    is_approved = bool(data.get("is_approved", True))
    product = Product.query.get_or_404(product_id)
    product.is_approved = is_approved
    db.session.commit()
    return {"message": "Product approval updated", "is_approved": product.is_approved}, 200


@admin_bp.get("/orders")
@auth_required(["ADMIN"])
def all_orders():
    orders = Order.query.order_by(Order.id.desc()).all()
    return {
        "items": [
            {
                "id": o.id,
                "user_id": o.user_id,
                "seller_id": o.seller_id,
                "status": o.status,
                "total_amount": o.total_amount,
                "shipping_fee": o.shipping_fee,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ]
    }, 200


@admin_bp.get("/payments")
@auth_required(["ADMIN"])
def all_payments():
    rows = PaymentTransaction.query.order_by(PaymentTransaction.id.desc()).all()
    return {
        "items": [
            {
                "id": p.id,
                "order_id": p.order_id,
                "user_id": p.user_id,
                "method": p.method,
                "amount": p.amount,
                "status": p.status,
                "transaction_code": p.transaction_code,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            }
            for p in rows
        ]
    }, 200
