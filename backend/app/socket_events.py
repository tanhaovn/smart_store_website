from flask import request
from flask_socketio import disconnect, emit, join_room

from app.database import db, socketio
from app.models import ChatMessage
from app.utils import verify_token


def _private_room(user_a: int, user_b: int) -> str:
    left, right = sorted([int(user_a), int(user_b)])
    return f"private:{left}:{right}"


@socketio.on("connect", namespace="/ws/chat")
def chat_connect(auth):
    token = ""
    if isinstance(auth, dict):
        token = str(auth.get("token", "")).strip()
    if not token:
        disconnect()
        return

    try:
        payload = verify_token(token)
    except Exception:
        disconnect()
        return

    request.environ["chat_user_id"] = payload.get("user_id")
    emit("connected", {"message": "connected", "user_id": payload.get("user_id")})


@socketio.on("join", namespace="/ws/chat")
def chat_join(data):
    user_id = request.environ.get("chat_user_id")
    peer_id = (data or {}).get("peer_id")
    if not user_id or not peer_id:
        emit("error", {"error": "peer_id is required"})
        return
    room = _private_room(user_id, int(peer_id))
    join_room(room)
    emit("joined", {"room": room})


@socketio.on("send_message", namespace="/ws/chat")
def chat_send_message(data):
    data = data or {}
    sender_id = request.environ.get("chat_user_id")
    receiver_id = data.get("receiver_id")
    message = str(data.get("message", "")).strip()
    order_id = data.get("order_id")

    if not sender_id:
        emit("error", {"error": "Unauthorized"})
        return
    if not receiver_id or not message:
        emit("error", {"error": "receiver_id and message are required"})
        return

    saved = ChatMessage(
        sender_id=int(sender_id),
        receiver_id=int(receiver_id),
        order_id=order_id,
        message=message,
    )
    db.session.add(saved)
    db.session.commit()

    room = _private_room(int(sender_id), int(receiver_id))
    payload = {
        "id": saved.id,
        "sender_id": saved.sender_id,
        "receiver_id": saved.receiver_id,
        "order_id": saved.order_id,
        "message": saved.message,
        "created_at": saved.created_at.isoformat(),
    }
    emit("new_message", payload, to=room)
