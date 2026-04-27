import os
import json
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl
from datetime import datetime

import pymysql
import psycopg2
from psycopg2.extras import execute_values


TABLES_IN_ORDER = [
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


TABLE_SELECT_SQL = {
    "users": "SELECT * FROM `users`",
    "categories": "SELECT * FROM `categories`",
    "products": "SELECT p.* FROM `products` p JOIN `users` u ON u.id = p.seller_id LEFT JOIN `categories` c ON c.id = p.category_id",
    "carts": "SELECT c.* FROM `carts` c JOIN `users` u ON u.id = c.user_id JOIN `products` p ON p.id = c.product_id",
    "orders": "SELECT o.* FROM `orders` o JOIN `users` u1 ON u1.id = o.user_id JOIN `users` u2 ON u2.id = o.seller_id",
    "order_items": "SELECT oi.* FROM `order_items` oi JOIN `orders` o ON o.id = oi.order_id JOIN `products` p ON p.id = oi.product_id",
    "promotions": "SELECT pr.* FROM `promotions` pr JOIN `users` u ON u.id = pr.seller_id",
    "chat_messages": "SELECT cm.* FROM `chat_messages` cm JOIN `users` s ON s.id = cm.sender_id JOIN `users` r ON r.id = cm.receiver_id LEFT JOIN `orders` o ON o.id = cm.order_id WHERE cm.order_id IS NULL OR o.id IS NOT NULL",
    "delivery_assignments": "SELECT da.* FROM `delivery_assignments` da JOIN `orders` o ON o.id = da.order_id JOIN `users` u ON u.id = da.shipper_id",
    "registration_otps": "SELECT * FROM `registration_otps`",
    "payment_transactions": "SELECT pt.* FROM `payment_transactions` pt JOIN `orders` o ON o.id = pt.order_id JOIN `users` u ON u.id = pt.user_id",
}


def ensure_sslmode_require(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query))
    if "sslmode" not in query:
        query["sslmode"] = "require"
    return urlunparse(parsed._replace(query=urlencode(query)))


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def fetch_mysql_rows(cursor, table: str):
    cursor.execute(TABLE_SELECT_SQL[table])
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    return columns, rows


def get_postgres_boolean_columns(pg_cursor, table: str):
    pg_cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND data_type = 'boolean'
        """,
        (table,),
    )
    return {row[0] for row in pg_cursor.fetchall()}


def normalize_rows_for_postgres(columns, rows, boolean_columns):
    if not rows or not boolean_columns:
        return rows

    bool_idx = [idx for idx, col in enumerate(columns) if col in boolean_columns]
    if not bool_idx:
        return rows

    normalized = []
    for row in rows:
        values = list(row)
        for idx in bool_idx:
            value = values[idx]
            if value is None:
                continue
            values[idx] = bool(value)
        normalized.append(tuple(values))
    return normalized


def copy_table(pg_cursor, table: str, columns, rows):
    if not rows:
        print(f"{table}: 0 rows")
        return

    boolean_columns = get_postgres_boolean_columns(pg_cursor, table)
    rows = normalize_rows_for_postgres(columns, rows, boolean_columns)

    col_sql = ", ".join(quote_ident(c) for c in columns)
    sql = f"INSERT INTO {quote_ident(table)} ({col_sql}) VALUES %s"
    execute_values(pg_cursor, sql, rows, page_size=1000)
    print(f"{table}: {len(rows)} rows")


def backup_postgres_destination(pg_cursor):
    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join("backups", f"postgres_pre_sync_{timestamp}.json")
    snapshot = {}

    for table in TABLES_IN_ORDER:
        pg_cursor.execute(f"SELECT * FROM {quote_ident(table)}")
        rows = pg_cursor.fetchall()
        columns = [desc.name for desc in pg_cursor.description]
        snapshot[table] = {
            "columns": columns,
            "rows": [list(row) for row in rows],
        }

    with open(backup_path, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2, default=str)

    print(f"Backup created: {backup_path}")


def sync_sequences(pg_cursor):
    for table in TABLES_IN_ORDER:
        seq_sql = "SELECT pg_get_serial_sequence(%s, 'id')"
        pg_cursor.execute(seq_sql, (table,))
        seq_row = pg_cursor.fetchone()
        if not seq_row or not seq_row[0]:
            continue

        pg_cursor.execute(f"SELECT COALESCE(MAX(id), 1) FROM {quote_ident(table)}")
        max_id = pg_cursor.fetchone()[0]
        pg_cursor.execute("SELECT setval(%s, %s, true)", (seq_row[0], max_id))


def main():
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_db = os.getenv("MYSQL_DB", "smart_store")

    postgres_url = os.getenv("POSTGRES_URL", "").strip()
    if not postgres_url:
        raise SystemExit("Missing POSTGRES_URL")
    postgres_url = ensure_sslmode_require(postgres_url)

    mysql_conn = pymysql.connect(
        host=mysql_host,
        port=mysql_port,
        user=mysql_user,
        password=mysql_password,
        database=mysql_db,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.Cursor,
    )
    pg_conn = psycopg2.connect(postgres_url)

    try:
        with mysql_conn.cursor() as mcur, pg_conn.cursor() as pcur:
            backup_postgres_destination(pcur)
            truncate_sql = "TRUNCATE TABLE " + ", ".join(quote_ident(t) for t in TABLES_IN_ORDER) + " RESTART IDENTITY CASCADE"
            pcur.execute(truncate_sql)

            for table in TABLES_IN_ORDER:
                cols, rows = fetch_mysql_rows(mcur, table)
                copy_table(pcur, table, cols, rows)

            sync_sequences(pcur)

        pg_conn.commit()
        print("Done: MySQL -> Postgres sync completed.")
    finally:
        mysql_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
