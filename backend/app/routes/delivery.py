from flask import Blueprint, g, request

from app.database import db
from app.models import ChatMessage, DeliveryAssignment, Order, User
from app.utils import auth_required, get_json_body, parse_float, parse_int, require_fields


delivery_bp = Blueprint("delivery", __name__)


def _serialize_chat_message(message: ChatMessage) -> dict:
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "order_id": message.order_id,
        "message": message.message,
        "created_at": message.created_at.isoformat(),
    }


def _build_delivery_chat_threads(shipper_id: int) -> list[dict]:
    assignments = (
        db.session.query(DeliveryAssignment, Order, User)
        .join(Order, Order.id == DeliveryAssignment.order_id)
        .join(User, User.id == Order.user_id)
        .filter(DeliveryAssignment.shipper_id == shipper_id)
        .order_by(Order.id.desc())
        .all()
    )

    threads = []
    seen_keys: set[str] = set()
    for assignment, order, customer in assignments:
        key = f"ORDER:{order.id}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        threads.append(
            {
                "key": key,
                "peer_type": "USER",
                "peer_id": customer.id,
                "order_id": order.id,
                "label": customer.full_name or customer.email or f"User #{customer.id}",
                "subtitle": f"Don #{order.id} - {order.status}",
            }
        )

    threads.sort(key=lambda item: (-(int(item.get("order_id") or 0)), item.get("label") or ""))
    return threads


def _resolve_delivery_chat_history(shipper_id: int, user_id: int, order_id: int):
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return None, ({"error": "Order not found"}, 404)

    assignment = DeliveryAssignment.query.filter_by(order_id=order.id, shipper_id=shipper_id).first()
    if not assignment:
        return None, ({"error": "Delivery assignment not found for this order"}, 404)

    customer = User.query.filter_by(id=user_id, role="USER").first()
    if not customer:
        return None, ({"error": "Customer not found"}, 404)

    messages = (
        ChatMessage.query.filter(
            ((ChatMessage.sender_id == shipper_id) & (ChatMessage.receiver_id == user_id) & (ChatMessage.order_id == order.id))
            | ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == shipper_id) & (ChatMessage.order_id == order.id))
        )
        .order_by(ChatMessage.id.asc())
        .all()
    )
    return messages, None


@delivery_bp.get("/")
@auth_required(["DELIVERY", "ADMIN"])
def delivery_home():
    return {"message": "DELIVERY API"}, 200


def _calculate_shipping_fee(distance_km: float, weight_kg: float) -> float:
    base = 12000
    distance_fee = max(distance_km, 0) * 3000
    weight_fee = max(weight_kg, 0) * 2000
    return round(base + distance_fee + weight_fee, 2)


@delivery_bp.post("/shipping-fee")
@auth_required(["USER", "SELLER", "DELIVERY", "ADMIN"])
def calculate_shipping_fee():
    data = get_json_body()
    distance_km = parse_float(data.get("distance_km", 0), "distance_km", minimum=0)
    weight_kg = parse_float(data.get("weight_kg", 0), "weight_kg", minimum=0)
    fee = _calculate_shipping_fee(distance_km, weight_kg)
    return {"shipping_fee": fee}, 200


@delivery_bp.get("/chat-peers")
@auth_required(["DELIVERY"])
def delivery_chat_peers():
    return {"items": _build_delivery_chat_threads(g.current_user_id)}, 200


@delivery_bp.get("/chat/<int:user_id>")
@auth_required(["DELIVERY"])
def delivery_chat_history(user_id: int):
    order_id_value = request.args.get("order_id")
    if not order_id_value or not str(order_id_value).strip():
        return {"error": "order_id is required"}, 400

    order_id = parse_int(order_id_value, "order_id", minimum=1)
    messages, error_response = _resolve_delivery_chat_history(g.current_user_id, user_id, order_id)
    if error_response:
        return error_response

    return {"items": [_serialize_chat_message(message) for message in messages]}, 200


@delivery_bp.post("/chat")
@auth_required(["DELIVERY"])
def delivery_chat():
    data = get_json_body()
    require_fields(data, ["user_id", "order_id", "message"])
    user_id = parse_int(data.get("user_id"), "user_id", minimum=1)
    order_id = parse_int(data.get("order_id"), "order_id", minimum=1)
    message = str(data.get("message", "")).strip()

    messages, error_response = _resolve_delivery_chat_history(g.current_user_id, user_id, order_id)
    if error_response:
        return error_response

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


@delivery_bp.post("/assign")
@auth_required(["ADMIN", "DELIVERY"])
def assign_order_to_shipper():
    data = get_json_body()
    require_fields(data, ["order_id"])
    order_id = data.get("order_id")
    shipper_id = data.get("shipper_id") or g.current_user_id

    order = Order.query.get_or_404(order_id)
    shipper = User.query.filter_by(id=shipper_id, role="DELIVERY").first()
    if not shipper:
        return {"error": "Shipper not found or not DELIVERY role"}, 404
    if g.current_user_role == "DELIVERY" and int(shipper_id) != int(g.current_user_id):
        return {"error": "Delivery account can only assign orders to itself"}, 403

    existing = DeliveryAssignment.query.filter_by(order_id=order.id).first()
    if existing:
        existing.shipper_id = shipper_id
    else:
        db.session.add(DeliveryAssignment(order_id=order.id, shipper_id=shipper_id, status=order.status))
    db.session.commit()
    return {"message": "Order assigned"}, 200


@delivery_bp.get("/orders")
@auth_required(["DELIVERY", "ADMIN"])
def delivery_orders():
    query = DeliveryAssignment.query
    if g.current_user_role == "DELIVERY":
        query = query.filter_by(shipper_id=g.current_user_id)

    assignments = query.order_by(DeliveryAssignment.id.desc()).all()
    return {
        "items": [
            {
                "assignment_id": a.id,
                "order_id": a.order_id,
                "shipper_id": a.shipper_id,
                "status": a.status,
            }
            for a in assignments
        ]
    }, 200


@delivery_bp.patch("/orders/<int:order_id>/status")
@auth_required(["DELIVERY", "ADMIN"])
def update_delivery_status(order_id: int):
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

    order = Order.query.get_or_404(order_id)
    assignment = DeliveryAssignment.query.filter_by(order_id=order.id).first()
    if g.current_user_role == "DELIVERY":
        if assignment and assignment.shipper_id != g.current_user_id:
            return {"error": "You are not assigned to this order"}, 403

    if not assignment:
        assignment = DeliveryAssignment(order_id=order.id, shipper_id=g.current_user_id, status=status)
        db.session.add(assignment)
    else:
        assignment.status = status
    order.status = status
    db.session.commit()
    return {"message": "Delivery status updated"}, 200


@delivery_bp.patch("/orders/<int:order_id>/info")
@auth_required(["DELIVERY", "ADMIN"])
def update_delivery_info(order_id: int):
    data = get_json_body()
    order = Order.query.get_or_404(order_id)
    assignment = DeliveryAssignment.query.filter_by(order_id=order.id).first()

    if g.current_user_role == "DELIVERY":
        if not assignment or assignment.shipper_id != g.current_user_id:
            return {"error": "You are not assigned to this order"}, 403

    if "shipping_address" in data:
        order.shipping_address = str(data["shipping_address"]).strip()
    if "shipping_phone" in data:
        order.shipping_phone = str(data["shipping_phone"]).strip()
    if "note" in data:
        order.note = str(data["note"]).strip()

    db.session.commit()
    return {"message": "Delivery info updated"}, 200


@delivery_bp.post("/mock-shipper/<int:order_id>/next")
@auth_required(["DELIVERY", "ADMIN"])
def mock_shipper_next(order_id: int):
    flow = ["CHO_XAC_NHAN", "DANG_CHUAN_BI", "DANG_GIAO", "DA_GIAO"]
    order = Order.query.get_or_404(order_id)
    current = order.status
    if current not in flow:
        current = flow[0]

    idx = flow.index(current)
    if idx < len(flow) - 1:
        order.status = flow[idx + 1]
    assignment = DeliveryAssignment.query.filter_by(order_id=order.id).first()
    if g.current_user_role == "DELIVERY":
        if assignment and assignment.shipper_id != g.current_user_id:
            return {"error": "You are not assigned to this order"}, 403
    if assignment:
        assignment.status = order.status
    else:
        db.session.add(DeliveryAssignment(order_id=order.id, shipper_id=g.current_user_id, status=order.status))

    db.session.commit()
    return {"order_id": order.id, "status": order.status}, 200
