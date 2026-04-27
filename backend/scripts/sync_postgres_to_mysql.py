import os
import json
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl
from datetime import datetime

import pymysql
import psycopg2


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
    "users": 'SELECT * FROM "users"',
    "categories": 'SELECT * FROM "categories"',
    "products": 'SELECT * FROM "products"',
    "carts": 'SELECT * FROM "carts"',
    "orders": 'SELECT * FROM "orders"',
    "order_items": 'SELECT * FROM "order_items"',
    "promotions": 'SELECT * FROM "promotions"',
    "chat_messages": 'SELECT * FROM "chat_messages"',
    "delivery_assignments": 'SELECT * FROM "delivery_assignments"',
    "registration_otps": 'SELECT * FROM "registration_otps"',
    "payment_transactions": 'SELECT * FROM "payment_transactions"',
}


def ensure_sslmode_require(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query))
    if "sslmode" not in query:
        query["sslmode"] = "require"
    return urlunparse(parsed._replace(query=urlencode(query)))


def fetch_postgres_rows(cursor, table: str):
    cursor.execute(TABLE_SELECT_SQL[table])
    rows = cursor.fetchall()
    columns = [desc.name for desc in cursor.description]
    return columns, rows


def get_mysql_boolean_columns(mysql_cursor, database_name: str, table: str):
    mysql_cursor.execute(
        """
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND DATA_TYPE = 'tinyint'
          AND COLUMN_TYPE = 'tinyint(1)'
        """,
        (database_name, table),
    )
    return {row[0] for row in mysql_cursor.fetchall()}


def normalize_rows_for_mysql(columns, rows, boolean_columns):
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
            values[idx] = 1 if bool(value) else 0
        normalized.append(tuple(values))
    return normalized


def copy_table(mysql_cursor, mysql_db: str, table: str, columns, rows):
    if not rows:
        print(f"{table}: 0 rows")
        return

    boolean_columns = get_mysql_boolean_columns(mysql_cursor, mysql_db, table)
    rows = normalize_rows_for_mysql(columns, rows, boolean_columns)

    col_sql = ", ".join(f"`{c}`" for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f"INSERT INTO `{table}` ({col_sql}) VALUES ({placeholders})"
    mysql_cursor.executemany(sql, rows)
    print(f"{table}: {len(rows)} rows")


def reset_mysql_tables(mysql_cursor):
    mysql_cursor.execute("SET FOREIGN_KEY_CHECKS=0")
    try:
        for table in reversed(TABLES_IN_ORDER):
            mysql_cursor.execute(f"TRUNCATE TABLE `{table}`")
    finally:
        mysql_cursor.execute("SET FOREIGN_KEY_CHECKS=1")


def backup_mysql_destination(mysql_cursor):
    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join("backups", f"mysql_pre_sync_{timestamp}.json")
    snapshot = {}

    for table in TABLES_IN_ORDER:
        mysql_cursor.execute(f"SELECT * FROM `{table}`")
        rows = mysql_cursor.fetchall()
        columns = [desc[0] for desc in mysql_cursor.description]
        snapshot[table] = {
            "columns": columns,
            "rows": [list(row) for row in rows],
        }

    with open(backup_path, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2, default=str)

    print(f"Backup created: {backup_path}")


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
        autocommit=False,
    )
    pg_conn = psycopg2.connect(postgres_url)

    try:
        with pg_conn.cursor() as pcur, mysql_conn.cursor() as mcur:
            backup_mysql_destination(mcur)
            reset_mysql_tables(mcur)

            for table in TABLES_IN_ORDER:
                cols, rows = fetch_postgres_rows(pcur, table)
                copy_table(mcur, mysql_db, table, cols, rows)

        mysql_conn.commit()
        print("Done: Postgres -> MySQL sync completed.")
    finally:
        mysql_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
