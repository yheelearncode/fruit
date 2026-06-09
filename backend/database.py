import json
import os
from typing import Any

import mysql.connector
from mysql.connector import MySQLConnection

from seed_data import DEFAULT_PRODUCTS


def load_env_file() -> None:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, encoding="utf-8") as env_file:
        for line in env_file:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


load_env_file()


MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "fruit_store"),
}


def _server_config() -> dict[str, Any]:
    return {key: value for key, value in MYSQL_CONFIG.items() if key != "database"}


def ensure_database() -> None:
    with mysql.connector.connect(**_server_config()) as connection:
        cursor = connection.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{MYSQL_CONFIG['database']}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )


def get_connection() -> MySQLConnection:
    return mysql.connector.connect(**MYSQL_CONFIG)


def init_db() -> None:
    ensure_database()

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(80) PRIMARY KEY,
                name VARCHAR(160) NOT NULL,
                subtitle VARCHAR(200) NOT NULL,
                origin VARCHAR(80) NOT NULL,
                maker VARCHAR(120) NOT NULL,
                series VARCHAR(120) NOT NULL,
                price INT NOT NULL,
                original_price INT NOT NULL,
                discount_rate INT NOT NULL,
                delivery_fee INT NOT NULL,
                free_delivery_minimum INT NOT NULL,
                options JSON NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(40) PRIMARY KEY,
                status VARCHAR(40) NOT NULL,
                buyer JSON NOT NULL,
                recipient JSON NOT NULL,
                items JSON NOT NULL,
                payment_method VARCHAR(40) NOT NULL,
                totals JSON NOT NULL,
                created_at DATETIME(6) NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        connection.commit()

    seed_products()


def seed_products() -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        for product in DEFAULT_PRODUCTS:
            cursor.execute(
                """
                INSERT INTO products (
                    id,
                    name,
                    subtitle,
                    origin,
                    maker,
                    series,
                    price,
                    original_price,
                    discount_rate,
                    delivery_fee,
                    free_delivery_minimum,
                    options
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    subtitle = VALUES(subtitle),
                    origin = VALUES(origin),
                    maker = VALUES(maker),
                    series = VALUES(series),
                    price = VALUES(price),
                    original_price = VALUES(original_price),
                    discount_rate = VALUES(discount_rate),
                    delivery_fee = VALUES(delivery_fee),
                    free_delivery_minimum = VALUES(free_delivery_minimum),
                    options = VALUES(options)
                """,
                (
                    product["id"],
                    product["name"],
                    product["subtitle"],
                    product["origin"],
                    product["maker"],
                    product["series"],
                    product["price"],
                    product["original_price"],
                    product["discount_rate"],
                    product["delivery_fee"],
                    product["free_delivery_minimum"],
                    json.dumps(product["options"], ensure_ascii=False),
                ),
            )
        connection.commit()


def _parse_product(row: dict[str, Any]) -> dict[str, Any]:
    return {
        **row,
        "options": json.loads(row["options"]) if isinstance(row["options"], str) else row["options"],
    }


def get_product(product_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        row = cursor.fetchone()

    return _parse_product(row) if row is not None else None


def save_order(order: dict[str, Any]) -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO orders (
                id,
                status,
                buyer,
                recipient,
                items,
                payment_method,
                totals,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order["id"],
                order["status"],
                json.dumps(order["buyer"], ensure_ascii=False),
                json.dumps(order["recipient"], ensure_ascii=False),
                json.dumps(order["items"], ensure_ascii=False),
                order["payment_method"],
                json.dumps(order["totals"], ensure_ascii=False),
                order["created_at"],
            ),
        )
        connection.commit()


def get_order(order_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        row = cursor.fetchone()

    if row is None:
        return None

    return {
        "id": row["id"],
        "status": row["status"],
        "buyer": json.loads(row["buyer"]) if isinstance(row["buyer"], str) else row["buyer"],
        "recipient": json.loads(row["recipient"]) if isinstance(row["recipient"], str) else row["recipient"],
        "items": json.loads(row["items"]) if isinstance(row["items"], str) else row["items"],
        "payment_method": row["payment_method"],
        "totals": json.loads(row["totals"]) if isinstance(row["totals"], str) else row["totals"],
        "created_at": row["created_at"].isoformat(),
    }
