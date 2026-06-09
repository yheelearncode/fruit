import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()



conn = mysql.connector.connect(
    host=os.getenv("db_host"),
    user=os.getenv("db_user"),
    password=os.getenv("db_password"),
    database=os.getenv("db_name"),
    port = os.getenv("db_port")
)

def init_db():
    cursor = conn.cursor()
    cursor.execute
    (
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
            free_delivery_minimum INT NOT NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(255) PRIMARY KEY,
            product_id VARCHAR(255) NOT NULL,
            buyer_name VARCHAR(255) NOT NULL,
            buyer_mobile VARCHAR(255) NOT NULL,
            buyer_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255) NOT NULL,
            recipient_mobile VARCHAR(255) NOT NULL,
            recipient_address VARCHAR(255) NOT NULL,
            quantity INT NOT NULL,
            total_price INT NOT NULL,
            order_date DATETIME NOT NULL
        """
        )
    
    conn.commit()
    cursor.close()
    conn.close()
        


