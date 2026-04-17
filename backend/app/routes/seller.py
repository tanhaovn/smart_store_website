import os
import uuid

from flask import Blueprint, current_app, g, request
from werkzeug.utils import secure_filename

from sqlalchemy import func

from app.database import db
from app.models import Category, ChatMessage, Order, Product, Promotion, User
from app.utils import auth_required, get_json_body, parse_float, parse_int, require_fields


seller_bp = Blueprint("seller", __name__)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _is_allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_IMAGE_EXTENSIONS


@seller_bp.get("/")
@auth_required(["SELLER"])
def seller_home():
    return {"message": "SELLER API"}, 200


@seller_bp.post("/products")
@auth_required(["SELLER"])
def create_product():
    data = get_json_body()
    require_fields(data, ["name", "price"])
    name = str(data.get("name", "")).strip()
    image_url = str(data.get("image_url", "")).strip()
    description = str(data.get("description", "")).strip()
    price = parse_float(data.get("price", 0), "price", minimum=0)
    stock = parse_int(data.get("stock", 0), "stock", minimum=0)
    category_id = data.get("category_id")

    if not name or price <= 0:
        return {"error": "name and valid price are required"}, 400

    product = Product(
        name=name,
        image_url=image_url,
        description=description,
        price=price,
        stock=stock,
        category_id=category_id,
        seller_id=g.current_user_id,
        is_approved=False,
    )
    db.session.add(product)
    db.session.commit()
    return {"message": "Product created and waiting for approval", "product_id": product.id}, 201


@seller_bp.get("/products")
@auth_required(["SELLER"])
def get_seller_products():
    items = Product.query.filter_by(seller_id=g.current_user_id).order_by(Product.id.desc()).all()
    return {
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "image_url": p.image_url,
                "price": p.price,
                "stock": p.stock,
                "is_approved": p.is_approved,
                "category_id": p.category_id,
            }
            for p in items
        ]
    }, 200


@seller_bp.patch("/products/<int:product_id>")
@auth_required(["SELLER"])
def update_product(product_id: int):
    data = get_json_body()
    product = Product.query.filter_by(id=product_id, seller_id=g.current_user_id).first_or_404()

    if "name" in data:
        product.name = str(data["name"]).strip()
    if "image_url" in data:
        product.image_url = str(data["image_url"]).strip()
    if "description" in data:
        product.description = str(data["description"]).strip()
    if "price" in data:
        product.price = parse_float(data["price"], "price", minimum=0)
    if "stock" in data:
        product.stock = parse_int(data["stock"], "stock", minimum=0)
    if "category_id" in data:
        product.category_id = data["category_id"]

    db.session.commit()
    return {"message": "Product updated"}, 200


@seller_bp.delete("/products/<int:product_id>")
@auth_required(["SELLER"])
def delete_product(product_id: int):
    product = Product.query.filter_by(id=product_id, seller_id=g.current_user_id).first_or_404()
    db.session.delete(product)
    db.session.commit()
    return {"message": "Product deleted"}, 200


@seller_bp.post("/products/<int:product_id>/upload-image")
@auth_required(["SELLER"])
def upload_product_image(product_id: int):
    product = Product.query.filter_by(id=product_id, seller_id=g.current_user_id).first_or_404()

    image_file = request.files.get("image")
    if not image_file or not image_file.filename:
        return {"error": "image file is required"}, 400
    if not _is_allowed_file(image_file.filename):
        return {"error": "Only png, jpg, jpeg, webp are allowed"}, 400

    ext = image_file.filename.rsplit(".", 1)[1].lower()
    safe_base = secure_filename(product.name) or "product"
    new_name = f"{product.id}-{safe_base}-{uuid.uuid4().hex[:8]}.{ext}"

    upload_root = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_root, exist_ok=True)
    save_path = os.path.join(upload_root, new_name)
    image_file.save(save_path)

    product.image_url = f"/static/uploads/products/{new_name}"
    db.session.commit()
    return {"message": "Product image uploaded", "image_url": product.image_url}, 200


@seller_bp.post("/categories")
@auth_required(["SELLER"])
def create_category():
    data = get_json_body()
    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    if not name:
        return {"error": "name is required"}, 400
    if Category.query.filter(func.lower(Category.name) == name.lower()).first():
        return {"error": "Category exists"}, 409
    category = Category(name=name, description=description)
    db.session.add(category)
    db.session.commit()
    return {"message": "Category created", "category_id": category.id}, 201


@seller_bp.get("/categories")
@auth_required(["SELLER"])
def get_categories():
    items = Category.query.order_by(Category.id.desc()).all()
    return {"items": [{"id": c.id, "name": c.name, "description": c.description} for c in items]}, 200


@seller_bp.patch("/categories/<int:category_id>")
@auth_required(["SELLER"])
def update_category(category_id: int):
    data = get_json_body()
    category = Category.query.get_or_404(category_id)
    if "name" in data:
        category.name = str(data["name"]).strip()
    if "description" in data:
        category.description = str(data["description"]).strip()
    db.session.commit()
    return {"message": "Category updated"}, 200


@seller_bp.delete("/categories/<int:category_id>")
@auth_required(["SELLER"])
def delete_category(category_id: int):
    category = Category.query.get_or_404(category_id)
    db.session.delete(category)
    db.session.commit()
    return {"message": "Category deleted"}, 200


@seller_bp.get("/orders")
@auth_required(["SELLER"])
def seller_orders():
    orders = Order.query.filter_by(seller_id=g.current_user_id).order_by(Order.id.desc()).all()
    return {
        "items": [
            {
                "id": o.id,
                "user_id": o.user_id,
                "status": o.status,
                "total_amount": o.total_amount,
                "shipping_fee": o.shipping_fee,
            }
            for o in orders
        ]
    }, 200


@seller_bp.patch("/orders/<int:order_id>/status")
@auth_required(["SELLER"])
def update_order_status(order_id: int):
    data = get_json_body()
    require_fields(data, ["status"])
    raw_status = str(data.get("status", "")).strip().upper()
    aliases = {
        "XAC_NHAN": "DANG_CHUAN_BI",
        "HOAN_THANH": "DA_GIAO",
    }
    status = aliases.get(raw_status, raw_status)
    allowed = {"CHO_XAC_NHAN", "DANG_CHUAN_BI", "DANG_GIAO", "DA_GIAO"}
    if status not in allowed:
        return {"error": f"status must be one of {sorted(allowed)}"}, 400

    order = Order.query.filter_by(id=order_id, seller_id=g.current_user_id).first_or_404()
    order.status = status
    db.session.commit()
    return {"message": "Order status updated"}, 200


@seller_bp.patch("/inventory/<int:product_id>")
@auth_required(["SELLER"])
def update_inventory(product_id: int):
    data = get_json_body()
    stock = parse_int(data.get("stock", -1), "stock", minimum=0)
    product = Product.query.filter_by(id=product_id, seller_id=g.current_user_id).first_or_404()
    product.stock = stock
    db.session.commit()
    return {"message": "Inventory updated"}, 200


@seller_bp.get("/revenue")
@auth_required(["SELLER"])
def revenue_summary():
    completed_orders = (
        Order.query.filter(Order.seller_id == g.current_user_id, Order.status.in_(["DA_GIAO", "HOAN_THANH"]))
        .order_by(Order.id.desc())
        .all()
    )
    total_revenue = sum(o.total_amount for o in completed_orders)
    return {"total_revenue": total_revenue, "completed_orders": len(completed_orders)}, 200


@seller_bp.post("/promotions")
@auth_required(["SELLER"])
def create_promotion():
    data = get_json_body()
    require_fields(data, ["code", "discount_percent"])
    code = str(data.get("code", "")).strip().upper()
    discount_percent = parse_float(data.get("discount_percent", 0), "discount_percent", minimum=0)
    if not code or discount_percent <= 0 or discount_percent > 100:
        return {"error": "Invalid promotion"}, 400

    promotion = Promotion(
        seller_id=g.current_user_id,
        code=code,
        discount_percent=discount_percent,
        is_active=True,
    )
    db.session.add(promotion)
    db.session.commit()
    return {"message": "Promotion created", "promotion_id": promotion.id}, 201


@seller_bp.get("/promotions")
@auth_required(["SELLER"])
def list_promotions():
    promotions = Promotion.query.filter_by(seller_id=g.current_user_id).order_by(Promotion.id.desc()).all()
    return {
        "items": [
            {
                "id": p.id,
                "code": p.code,
                "discount_percent": p.discount_percent,
                "is_active": p.is_active,
            }
            for p in promotions
        ]
    }, 200


@seller_bp.post("/chat")
@auth_required(["SELLER"])
def seller_chat():
    data = get_json_body()
    require_fields(data, ["user_id", "message"])
    user_id = data.get("user_id")
    message = str(data.get("message", "")).strip()
    order_id = data.get("order_id")

    user = User.query.filter_by(id=user_id, role="USER").first()
    if not user:
        return {"error": "User not found"}, 404
    db.session.add(
        ChatMessage(
            sender_id=g.current_user_id,
            receiver_id=user_id,
            order_id=order_id,
            message=message,
        )
    )
    db.session.commit()
    return {"message": "Message sent"}, 201


@seller_bp.get("/chat-users")
@auth_required(["SELLER"])
def seller_chat_users():
    seller_id = g.current_user_id

    ordered_user_ids = {
        row[0]
        for row in db.session.query(Order.user_id)
        .filter(Order.seller_id == seller_id)
        .distinct()
        .all()
        if row[0] is not None
    }

    incoming_user_ids = {
        row[0]
        for row in db.session.query(ChatMessage.sender_id)
        .filter(ChatMessage.receiver_id == seller_id)
        .distinct()
        .all()
        if row[0] is not None
    }

    outgoing_user_ids = {
        row[0]
        for row in db.session.query(ChatMessage.receiver_id)
        .filter(ChatMessage.sender_id == seller_id)
        .distinct()
        .all()
        if row[0] is not None
    }

    user_ids = ordered_user_ids | incoming_user_ids | outgoing_user_ids
    if not user_ids:
        return {"items": []}, 200

    users = (
        User.query.filter(User.id.in_(user_ids), User.role == "USER")
        .order_by(User.full_name.asc(), User.id.asc())
        .all()
    )

    latest_order_by_user = {}
    orders = (
        Order.query.filter(Order.seller_id == seller_id, Order.user_id.in_(user_ids))
        .order_by(Order.id.desc())
        .all()
    )
    for order in orders:
        if order.user_id not in latest_order_by_user:
            latest_order_by_user[order.user_id] = order.id

    return {
        "items": [
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "latest_order_id": latest_order_by_user.get(user.id),
            }
            for user in users
        ]
    }, 200


@seller_bp.get("/chat/<int:user_id>")
@auth_required(["SELLER"])
def seller_chat_history(user_id: int):
    messages = (
        ChatMessage.query.filter(
            ((ChatMessage.sender_id == g.current_user_id) & (ChatMessage.receiver_id == user_id))
            | ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == g.current_user_id))
        )
        .order_by(ChatMessage.id.asc())
        .all()
    )
    return {
        "items": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ]
    }, 200
