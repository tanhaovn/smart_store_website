from datetime import datetime
import uuid
from urllib.parse import quote_plus

from flask import Blueprint, current_app, g, request

from app.database import db
from app.models import Cart, ChatMessage, DeliveryAssignment, Order, OrderItem, PaymentTransaction, Product, User
from app.utils import auth_required, get_json_body, parse_int, require_fields


user_bp = Blueprint("user", __name__)


def _serialize_chat_message(message: ChatMessage) -> dict:
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "order_id": message.order_id,
        "message": message.message,
        "created_at": message.created_at.isoformat(),
    }


def _build_chat_threads(user_id: int) -> list[dict]:
    seller_ids = set()
    latest_order_by_seller: dict[int, int] = {}

    orders = Order.query.filter(Order.user_id == user_id).order_by(Order.id.desc()).all()
    for order in orders:
        seller_ids.add(order.seller_id)
        if order.seller_id not in latest_order_by_seller:
            latest_order_by_seller[order.seller_id] = order.id

    for row in db.session.query(ChatMessage.sender_id).filter(ChatMessage.receiver_id == user_id).distinct().all():
        if row[0] is not None:
            seller_ids.add(row[0])

    for row in db.session.query(ChatMessage.receiver_id).filter(ChatMessage.sender_id == user_id).distinct().all():
        if row[0] is not None:
            seller_ids.add(row[0])

    sellers = []
    if seller_ids:
        sellers = (
            User.query.filter(User.id.in_(seller_ids), User.role == "SELLER")
            .order_by(User.full_name.asc(), User.id.asc())
            .all()
        )

    threads: list[dict] = []
    for seller in sellers:
        threads.append(
            {
                "key": f"SELLER:{seller.id}",
                "peer_type": "SELLER",
                "peer_id": seller.id,
                "order_id": latest_order_by_seller.get(seller.id),
                "label": seller.full_name or seller.email or f"Seller #{seller.id}",
                "subtitle": seller.email,
            }
        )

    delivery_rows = (
        db.session.query(DeliveryAssignment, Order, User)
        .join(Order, Order.id == DeliveryAssignment.order_id)
        .join(User, User.id == DeliveryAssignment.shipper_id)
        .filter(Order.user_id == user_id)
        .order_by(Order.id.desc())
        .all()
    )
    seen_delivery_keys: set[str] = set()
    for assignment, order, shipper in delivery_rows:
        key = f"DELIVERY:{shipper.id}:{order.id}"
        if key in seen_delivery_keys:
            continue
        seen_delivery_keys.add(key)
        threads.append(
            {
                "key": key,
                "peer_type": "DELIVERY",
                "peer_id": shipper.id,
                "order_id": order.id,
                "label": shipper.full_name or shipper.email or f"Shipper #{shipper.id}",
                "subtitle": f"Don #{order.id} - {order.status}",
            }
        )

    threads.sort(
        key=lambda item: (
            item.get("peer_type") != "DELIVERY",
            -(int(item.get("order_id") or 0)),
            item.get("label") or "",
        )
    )
    return threads


def _resolve_chat_history(user_id: int, peer_type: str, peer_id: int, order_id: int | None):
    normalized_peer_type = str(peer_type or "").strip().upper()
    if normalized_peer_type == "SELLER":
        peer = User.query.filter_by(id=peer_id, role="SELLER").first()
        if not peer:
            return None, ({"error": "Seller not found"}, 404)

        query = ChatMessage.query.filter(
            ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == peer.id))
            | ((ChatMessage.sender_id == peer.id) & (ChatMessage.receiver_id == user_id))
        )
        if order_id is not None:
            query = query.filter(ChatMessage.order_id == order_id)
        return query.order_by(ChatMessage.id.asc()).all(), None

    if normalized_peer_type == "DELIVERY":
        if order_id is None:
            return None, ({"error": "order_id is required for delivery chat"}, 400)

        order = Order.query.filter_by(id=order_id, user_id=user_id).first()
        if not order:
            return None, ({"error": "Order not found"}, 404)

        assignment = DeliveryAssignment.query.filter_by(order_id=order.id, shipper_id=peer_id).first()
        if not assignment:
            return None, ({"error": "Delivery partner not found for this order"}, 404)

        peer = User.query.filter_by(id=peer_id, role="DELIVERY").first()
        if not peer:
            return None, ({"error": "Delivery partner not found"}, 404)

        query = ChatMessage.query.filter(
            ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == peer.id))
            & (ChatMessage.order_id == order.id)
            | ((ChatMessage.sender_id == peer.id) & (ChatMessage.receiver_id == user_id))
            & (ChatMessage.order_id == order.id)
        )
        return query.order_by(ChatMessage.id.asc()).all(), None

    return None, ({"error": "peer_type must be SELLER or DELIVERY"}, 400)


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


def _build_payment_qr_url(method: str, order_id: int, amount: float) -> str:
    amount_value = max(int(round(float(amount))), 0)
    if method == "BANKING":
        bank_bin = current_app.config.get("QR_BANK_BIN", "970422")
        account_no = current_app.config.get("QR_ACCOUNT_NO", "0933333333")
        account_name = quote_plus(current_app.config.get("QR_ACCOUNT_NAME", "SMART VISION SHOP"))
        template = current_app.config.get("QR_TEMPLATE", "compact2")
        add_info = quote_plus(f"Thanh toan don {order_id}")
        return (
            f"https://img.vietqr.io/image/{bank_bin}-{account_no}-{template}.png"
            f"?amount={amount_value}&addInfo={add_info}&accountName={account_name}"
        )

    momo_phone = current_app.config.get("MOMO_PHONE", "0933333333")
    payload = quote_plus(f"MOMO|{momo_phone}|{amount_value}|Thanh toan don {order_id}")
    return f"https://api.qrserver.com/v1/create-qr-code/?size=360x360&data={payload}"


@user_bp.post("/orders")
@auth_required(["USER"])
def place_order():
    data = get_json_body()
    shipping_address = str(data.get("shipping_address", "")).strip()
    shipping_phone = str(data.get("shipping_phone", "")).strip()
    payment_method = str(data.get("payment_method", "COD")).strip().upper()
    note = str(data.get("note", "")).strip()
    allowed_payment_methods = {"COD", "BANKING", "MOMO"}

    if not shipping_address or not shipping_phone:
        return {"error": "shipping_address and shipping_phone are required"}, 400
    if payment_method not in allowed_payment_methods:
        return {"error": f"payment_method must be one of {sorted(allowed_payment_methods)}"}, 400

    cart_items = Cart.query.filter_by(user_id=g.current_user_id).all()
    if not cart_items:
        return {"error": "Cart is empty"}, 400

    # Build a deterministic snapshot first, then create orders by seller.
    cart_snapshot = []
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if not product or not product.is_approved:
            return {"error": f"Product {item.product_id} is not available"}, 400
        if item.quantity > product.stock:
            return {"error": f"Product {item.product_id} is out of stock"}, 400
        cart_snapshot.append((item, product))

    grouped_by_seller: dict[int, list[tuple[Cart, Product]]] = {}
    for item, product in cart_snapshot:
        grouped_by_seller.setdefault(product.seller_id, []).append((item, product))

    created_orders = []
    for seller_id, seller_items in grouped_by_seller.items():
        order_total = 0.0
        order_quantity = 0
        for item, product in seller_items:
            order_total += product.price * item.quantity
            order_quantity += item.quantity

        shipping_fee = _simple_shipping_fee(order_quantity)
        order = Order(
            user_id=g.current_user_id,
            seller_id=seller_id,
            total_amount=order_total,
            shipping_fee=shipping_fee,
            payment_method=payment_method,
            shipping_address=shipping_address,
            shipping_phone=shipping_phone,
            note=note,
            status="CHO_XAC_NHAN",
        )
        db.session.add(order)
        db.session.flush()

        for item, product in seller_items:
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

        created_orders.append(
            {
                "order_id": order.id,
                "seller_id": seller_id,
                "total_amount": order_total,
                "shipping_fee": shipping_fee,
                "grand_total": order_total + shipping_fee,
            }
        )

    db.session.commit()

    total_amount = sum(order["total_amount"] for order in created_orders)
    shipping_fee = sum(order["shipping_fee"] for order in created_orders)
    response = {
        "message": "Orders created" if len(created_orders) > 1 else "Order created",
        "order_id": created_orders[0]["order_id"],
        "order_ids": [order["order_id"] for order in created_orders],
        "items": created_orders,
        "total_amount": total_amount,
        "shipping_fee": shipping_fee,
        "grand_total": total_amount + shipping_fee,
    }
    return response, 201


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


@user_bp.get("/orders/<int:order_id>/payment-qr")
@auth_required(["USER"])
def get_order_payment_qr(order_id: int):
    method = str(request.args.get("method", "BANKING")).strip().upper() or "BANKING"
    if method not in {"BANKING", "MOMO"}:
        return {"error": "QR payment only supports BANKING or MOMO"}, 400

    order = Order.query.filter_by(id=order_id, user_id=g.current_user_id).first_or_404()
    amount = float(order.total_amount or 0) + float(order.shipping_fee or 0)
    qr_url = _build_payment_qr_url(method=method, order_id=order.id, amount=amount)
    return {
        "order_id": order.id,
        "method": method,
        "amount": amount,
        "qr_url": qr_url,
        "message": "Quet ma QR de thanh toan dung so tien don hang",
    }, 200


@user_bp.post("/chat")
@auth_required(["USER"])
def chat_with_shop():
    data = get_json_body()
    require_fields(data, ["message"])
    peer_type = str(data.get("peer_type", "SELLER")).strip().upper() or "SELLER"
    peer_id_value = data.get("peer_id", data.get("seller_id"))
    if peer_id_value in (None, ""):
        return {"error": "peer_id is required"}, 400

    peer_id = parse_int(peer_id_value, "peer_id", minimum=1)
    message = str(data.get("message", "")).strip()
    order_id_value = data.get("order_id")
    order_id = None
    if str(order_id_value).strip():
        order_id = parse_int(order_id_value, "order_id", minimum=1)

    receiver_id = peer_id

    if peer_type == "SELLER":
        seller = User.query.filter_by(id=peer_id, role="SELLER").first()
        if not seller:
            return {"error": "Seller not found"}, 404
        if order_id is not None:
            order = Order.query.filter_by(id=order_id, user_id=g.current_user_id, seller_id=seller.id).first()
            if not order:
                return {"error": "Order not found"}, 404
    elif peer_type == "DELIVERY":
        if order_id is None:
            return {"error": "order_id is required for delivery chat"}, 400
        order = Order.query.filter_by(id=order_id, user_id=g.current_user_id).first()
        if not order:
            return {"error": "Order not found"}, 404
        assignment = DeliveryAssignment.query.filter_by(order_id=order.id, shipper_id=peer_id).first()
        if not assignment:
            return {"error": "Delivery partner not found for this order"}, 404

        delivery_partner = User.query.filter_by(id=peer_id, role="DELIVERY").first()
        if not delivery_partner:
            return {"error": "Delivery partner not found"}, 404
    else:
        return {"error": "peer_type must be SELLER or DELIVERY"}, 400

    db.session.add(
        ChatMessage(
            sender_id=g.current_user_id,
            receiver_id=receiver_id,
            order_id=order_id,
            message=message,
        )
    )
    db.session.commit()
    return {"message": "Message sent"}, 201


@user_bp.get("/chat-peers")
@auth_required(["USER"])
def get_chat_peers():
    return {"items": _build_chat_threads(g.current_user_id)}, 200


@user_bp.get("/chat/<peer_type>/<int:peer_id>")
@auth_required(["USER"])
def get_chat_history_by_peer(peer_type: str, peer_id: int):
    order_id_value = request.args.get("order_id")
    order_id = None
    if order_id_value and str(order_id_value).strip():
        order_id = parse_int(order_id_value, "order_id", minimum=1)

    messages, error_response = _resolve_chat_history(g.current_user_id, peer_type, peer_id, order_id)
    if error_response:
        return error_response

    return {"items": [_serialize_chat_message(message) for message in messages]}, 200


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
