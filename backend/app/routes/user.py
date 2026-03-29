from datetime import datetime
import uuid

from flask import Blueprint, g, request

from app.database import db
from app.models import Cart, ChatMessage, Order, OrderItem, PaymentTransaction, Product, User
from app.utils import auth_required, get_json_body, parse_int, require_fields


user_bp = Blueprint("user", __name__)


@user_bp.get("/products")
def search_products():
    query = Product.query.filter_by(is_approved=True)

    keyword = request.args.get("query", "").strip()
    if keyword:
        query = query.filter(Product.name.ilike(f"%{keyword}%"))

    category_id = request.args.get("category_id", type=int)
    if category_id:
        query = query.filter(Product.category_id == category_id)

    min_price = request.args.get("min_price", type=float)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    max_price = request.args.get("max_price", type=float)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    products = query.order_by(Product.id.desc()).all()
    return {
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "image_url": p.image_url,
                "price": p.price,
                "stock": p.stock,
                "seller_id": p.seller_id,
            }
            for p in products
        ]
    }, 200


@user_bp.get("/products/<int:product_id>")
def product_detail(product_id: int):
    product = Product.query.get_or_404(product_id)
    if not product.is_approved:
        return {"error": "Product not available"}, 404
    return {
        "id": product.id,
        "name": product.name,
        "image_url": product.image_url,
        "description": product.description,
        "price": product.price,
        "stock": product.stock,
        "seller_id": product.seller_id,
        "category_id": product.category_id,
    }, 200


@user_bp.get("/cart")
@auth_required(["USER"])
def get_cart():
    items = Cart.query.filter_by(user_id=g.current_user_id).all()
    payload = []
    total = 0.0
    for item in items:
        product = Product.query.get(item.product_id)
        if not product:
            continue
        line_total = product.price * item.quantity
        total += line_total
        payload.append(
            {
                "cart_id": item.id,
                "product_id": product.id,
                "name": product.name,
                "quantity": item.quantity,
                "price": product.price,
                "line_total": line_total,
            }
        )
    return {"items": payload, "total": total}, 200


@user_bp.post("/cart")
@auth_required(["USER"])
def add_to_cart():
    data = get_json_body()
    require_fields(data, ["product_id"])
    product_id = data.get("product_id")
    quantity = parse_int(data.get("quantity", 1), "quantity", minimum=1)

    product = Product.query.get(product_id)
    if not product or not product.is_approved:
        return {"error": "Invalid product"}, 400
    if quantity < 1:
        return {"error": "Quantity must be >= 1"}, 400

    cart_item = Cart.query.filter_by(user_id=g.current_user_id, product_id=product.id).first()
    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = Cart(user_id=g.current_user_id, product_id=product.id, quantity=quantity)
        db.session.add(cart_item)
    db.session.commit()
    return {"message": "Added to cart"}, 201


@user_bp.patch("/cart/<int:cart_id>")
@auth_required(["USER"])
def update_cart_item(cart_id: int):
    data = get_json_body()
    quantity = parse_int(data.get("quantity", 1), "quantity", minimum=1)
    item = Cart.query.filter_by(id=cart_id, user_id=g.current_user_id).first_or_404()
    item.quantity = quantity
    db.session.commit()
    return {"message": "Cart updated"}, 200


@user_bp.delete("/cart/<int:cart_id>")
@auth_required(["USER"])
def delete_cart_item(cart_id: int):
    item = Cart.query.filter_by(id=cart_id, user_id=g.current_user_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return {"message": "Cart item deleted"}, 200


def _simple_shipping_fee(total_quantity: int) -> float:
    return 15000 + (2000 * max(total_quantity - 1, 0))


@user_bp.post("/orders")
@auth_required(["USER"])
def place_order():
    data = get_json_body()
    shipping_address = str(data.get("shipping_address", "")).strip()
    shipping_phone = str(data.get("shipping_phone", "")).strip()
    payment_method = str(data.get("payment_method", "COD")).strip().upper()
    note = str(data.get("note", "")).strip()

    if not shipping_address or not shipping_phone:
        return {"error": "shipping_address and shipping_phone are required"}, 400

    cart_items = Cart.query.filter_by(user_id=g.current_user_id).all()
    if not cart_items:
        return {"error": "Cart is empty"}, 400

    first_product = Product.query.get(cart_items[0].product_id)
    if not first_product:
        return {"error": "Invalid cart"}, 400

    total_amount = 0.0
    total_quantity = 0
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if not product or item.quantity > product.stock:
            return {"error": f"Product {item.product_id} is out of stock"}, 400
        total_amount += product.price * item.quantity
        total_quantity += item.quantity

    shipping_fee = _simple_shipping_fee(total_quantity)
    order = Order(
        user_id=g.current_user_id,
        seller_id=first_product.seller_id,
        total_amount=total_amount,
        shipping_fee=shipping_fee,
        payment_method=payment_method,
        shipping_address=shipping_address,
        shipping_phone=shipping_phone,
        note=note,
        status="CHO_XAC_NHAN",
    )
    db.session.add(order)
    db.session.flush()

    for item in cart_items:
        product = Product.query.get(item.product_id)
        product.stock -= item.quantity
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price,
            )
        )
        db.session.delete(item)

    db.session.commit()
    return {
        "message": "Order created",
        "order_id": order.id,
        "total_amount": total_amount,
        "shipping_fee": shipping_fee,
        "grand_total": total_amount + shipping_fee,
    }, 201


@user_bp.get("/orders")
@auth_required(["USER"])
def user_orders():
    orders = Order.query.filter_by(user_id=g.current_user_id).order_by(Order.id.desc()).all()
    return {
        "items": [
            {
                "id": o.id,
                "status": o.status,
                "total_amount": o.total_amount,
                "shipping_fee": o.shipping_fee,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ]
    }, 200


@user_bp.get("/orders/<int:order_id>")
@auth_required(["USER"])
def user_order_detail(order_id: int):
    order = Order.query.filter_by(id=order_id, user_id=g.current_user_id).first_or_404()
    items = OrderItem.query.filter_by(order_id=order.id).all()
    payment = PaymentTransaction.query.filter_by(order_id=order.id).first()
    return {
        "id": order.id,
        "status": order.status,
        "shipping_address": order.shipping_address,
        "shipping_phone": order.shipping_phone,
        "payment_method": order.payment_method,
        "total_amount": order.total_amount,
        "shipping_fee": order.shipping_fee,
        "payment_status": payment.status if payment else "UNPAID",
        "payment_transaction_code": payment.transaction_code if payment else None,
        "items": [
            {
                "product_id": i.product_id,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
            }
            for i in items
        ],
    }, 200


@user_bp.post("/orders/<int:order_id>/pay")
@auth_required(["USER"])
def pay_order(order_id: int):
    data = get_json_body()
    method = str(data.get("method", "")).strip().upper() or "COD"
    allowed_methods = {"COD", "BANKING", "MOMO"}
    if method not in allowed_methods:
        return {"error": f"method must be one of {sorted(allowed_methods)}"}, 400

    order = Order.query.filter_by(id=order_id, user_id=g.current_user_id).first_or_404()
    amount = order.total_amount + order.shipping_fee
    transaction = PaymentTransaction.query.filter_by(order_id=order.id).first()
    if transaction and transaction.status == "SUCCESS":
        return {
            "message": "Order already paid",
            "payment_status": transaction.status,
            "transaction_code": transaction.transaction_code,
        }, 200

    if not transaction:
        transaction = PaymentTransaction(
            order_id=order.id,
            user_id=g.current_user_id,
            method=method,
            amount=amount,
            status="SUCCESS" if method != "COD" else "PENDING",
            transaction_code=f"PAY-{uuid.uuid4().hex[:10].upper()}",
            paid_at=datetime.utcnow() if method != "COD" else None,
        )
        db.session.add(transaction)
    else:
        transaction.method = method
        transaction.amount = amount
        transaction.status = "SUCCESS" if method != "COD" else "PENDING"
        transaction.paid_at = datetime.utcnow() if method != "COD" else None
        if not transaction.transaction_code:
            transaction.transaction_code = f"PAY-{uuid.uuid4().hex[:10].upper()}"

    db.session.commit()
    return {
        "message": "Payment processed",
        "order_id": order.id,
        "payment_status": transaction.status,
        "transaction_code": transaction.transaction_code,
        "amount": transaction.amount,
        "method": transaction.method,
    }, 200


@user_bp.get("/orders/<int:order_id>/payment")
@auth_required(["USER"])
def get_order_payment(order_id: int):
    order = Order.query.filter_by(id=order_id, user_id=g.current_user_id).first_or_404()
    transaction = PaymentTransaction.query.filter_by(order_id=order.id).first()
    if not transaction:
        return {"order_id": order.id, "status": "UNPAID"}, 200
    return {
        "order_id": order.id,
        "status": transaction.status,
        "method": transaction.method,
        "amount": transaction.amount,
        "transaction_code": transaction.transaction_code,
        "paid_at": transaction.paid_at.isoformat() if transaction.paid_at else None,
    }, 200


@user_bp.post("/chat")
@auth_required(["USER"])
def chat_with_shop():
    data = get_json_body()
    require_fields(data, ["seller_id", "message"])
    seller_id = data.get("seller_id")
    message = str(data.get("message", "")).strip()
    order_id = data.get("order_id")

    seller = User.query.filter_by(id=seller_id, role="SELLER").first()
    if not seller:
        return {"error": "Seller not found"}, 404
    db.session.add(
        ChatMessage(
            sender_id=g.current_user_id,
            receiver_id=seller_id,
            order_id=order_id,
            message=message,
        )
    )
    db.session.commit()
    return {"message": "Message sent"}, 201


@user_bp.get("/chat/<int:seller_id>")
@auth_required(["USER"])
def get_chat_history(seller_id: int):
    messages = (
        ChatMessage.query.filter(
            ((ChatMessage.sender_id == g.current_user_id) & (ChatMessage.receiver_id == seller_id))
            | ((ChatMessage.sender_id == seller_id) & (ChatMessage.receiver_id == g.current_user_id))
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
