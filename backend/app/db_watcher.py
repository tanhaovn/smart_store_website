import os
import threading
import time
from datetime import datetime

from sqlalchemy import text

from app.database import db, socketio


WATCHED_TABLES = [
    "users",
    "categories",
    "products",
    "carts",
    "orders",
    "order_items",
    "promotions",
    "chat_messages",
    "delivery_assignments",
    "registration_otps",
    "payment_transactions",
]


_watcher_started = False


def _table_signature(connection, table_name: str) -> str:
    # Lightweight signature to avoid full-table scans on every polling cycle.
    row = connection.execute(
        text(
            f"SELECT COUNT(*) AS row_count, COALESCE(MAX(id), 0) AS max_id "
            f"FROM {table_name}"
        )
    ).first()
    row_count = int(row.row_count or 0)
    max_id = int(row.max_id or 0)
    return f"{row_count}:{max_id}"


def _snapshot_signatures() -> dict[str, str]:
    signatures: dict[str, str] = {}
    with db.engine.connect() as connection:
        for table_name in WATCHED_TABLES:
            signatures[table_name] = _table_signature(connection, table_name)
    return signatures


def _watch_loop(interval_seconds: int):
    baseline = None

    while True:
        try:
            current = _snapshot_signatures()
            if baseline is None:
                baseline = current
            else:
                changed_tables = [
                    table_name
                    for table_name in WATCHED_TABLES
                    if baseline.get(table_name) != current.get(table_name)
                ]
                if changed_tables:
                    payload = {
                        "changed_tables": changed_tables,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                    socketio.emit("db_changed", payload, namespace="/ws/chat")
                    baseline = current
        except Exception as error:  # pragma: no cover - background watcher
            socketio.emit(
                "db_watch_error",
                {"error": str(error)},
                namespace="/ws/chat",
            )

        time.sleep(interval_seconds)


def start_db_change_watcher(app):
    global _watcher_started
    if _watcher_started:
        return

    enabled = str(os.getenv("DB_WATCHER_ENABLED", "false")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if not enabled:
        return

    interval_seconds = int(os.getenv("DB_WATCH_INTERVAL_SECONDS", "3"))
    if interval_seconds < 1:
        interval_seconds = 1

    _watcher_started = True

    def runner():
        with app.app_context():
            _watch_loop(interval_seconds)

    socketio.start_background_task(runner)
