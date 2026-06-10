from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import mysql.connector
from dotenv import load_dotenv

from seed_data import DEFAULT_PRODUCTS


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")


def _env(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value not in (None, ""):
            return value
    return default


def _db_config() -> dict[str, Any]:
    port = _env("MYSQL_PORT", "db_port", default="3306")
    return {
        "host": _env("MYSQL_HOST", "db_host", default="127.0.0.1"),
        "user": _env("MYSQL_USER", "db_user"),
        "password": _env("MYSQL_PASSWORD", "db_password", default=""),
        "database": _env("MYSQL_DATABASE", "db_name"),
        "port": int(port or 3306),
    }


def _quote_identifier(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", value):
        raise RuntimeError(f"Invalid MySQL identifier: {value!r}")
    return f"`{value}`"


def _ensure_database() -> None:
    config = _db_config()
    database = config.pop("database")
    if not database:
        raise RuntimeError("Missing MySQL configuration value: database")

    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {_quote_identifier(database)}")
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _connect(dictionary: bool = False):
    config = _db_config()
    missing = [key for key in ("user", "database") if not config.get(key)]
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(f"Missing MySQL configuration value(s): {names}")

    conn = mysql.connector.connect(**config)
    if dictionary:
        return conn, conn.cursor(dictionary=True)
    return conn, conn.cursor()


def init_db() -> None:
    _ensure_database()
    conn, cursor = _connect()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255) NOT NULL,
                origin VARCHAR(255) NOT NULL,
                maker VARCHAR(255) NOT NULL,
                series VARCHAR(255) NOT NULL,
                price INT NOT NULL,
                original_price INT NOT NULL,
                discount_rate INT NOT NULL,
                delivery_fee INT NOT NULL,
                free_delivery_minimum INT NOT NULL,
                options LONGTEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            SELECT COUNT(*) AS column_count
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'products'
              AND column_name = 'options'
            """
        )
        column_count = cursor.fetchone()[0]
        if column_count == 0:
            cursor.execute("ALTER TABLE products ADD COLUMN options LONGTEXT NULL")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(255) PRIMARY KEY,
                status VARCHAR(64) NOT NULL,
                buyer LONGTEXT NOT NULL,
                recipient LONGTEXT NOT NULL,
                items LONGTEXT NOT NULL,
                payment_method VARCHAR(64) NOT NULL,
                totals LONGTEXT NOT NULL,
                created_at VARCHAR(64) NOT NULL
            )
            """
        )
        _seed_products(cursor)
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _seed_products(cursor) -> None:
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


def get_product(product_id: str) -> dict[str, Any] | None:
    conn, cursor = _connect(dictionary=True)
    try:
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if row is None:
        return None

    row["options"] = json.loads(row["options"])
    return row


def save_order(order: dict[str, Any]) -> None:
    conn, cursor = _connect()
    try:
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
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def get_order(order_id: str) -> dict[str, Any] | None:
    conn, cursor = _connect(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if row is None:
        return None

    return {
        "id": row["id"],
        "status": row["status"],
        "buyer": json.loads(row["buyer"]),
        "recipient": json.loads(row["recipient"]),
        "items": json.loads(row["items"]),
        "payment_method": row["payment_method"],
        "totals": json.loads(row["totals"]),
        "created_at": row["created_at"],
    }
