from flask import Blueprint, g

from app.database import db
from app.models import DeliveryAssignment, Order
from app.utils import auth_required, get_json_body, parse_float, require_fields


delivery_bp = Blueprint("delivery", __name__)


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


@delivery_bp.post("/assign")
@auth_required(["ADMIN", "DELIVERY"])
def assign_order_to_shipper():
    data = get_json_body()
    require_fields(data, ["order_id"])
    order_id = data.get("order_id")
    shipper_id = data.get("shipper_id") or g.current_user_id

    order = Order.query.get_or_404(order_id)
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
    status = str(data.get("status", "")).strip().upper()
    allowed = {"CHO_XAC_NHAN", "DANG_CHUAN_BI", "DANG_GIAO", "DA_GIAO"}
    if status not in allowed:
        return {"error": f"status must be one of {sorted(allowed)}"}, 400

    order = Order.query.get_or_404(order_id)
    assignment = DeliveryAssignment.query.filter_by(order_id=order.id).first()
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
    if assignment:
        assignment.status = order.status
    else:
        db.session.add(DeliveryAssignment(order_id=order.id, shipper_id=g.current_user_id, status=order.status))

    db.session.commit()
    return {"order_id": order.id, "status": order.status}, 200
