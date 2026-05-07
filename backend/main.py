from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


app = FastAPI(title="Sejin Store API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


PRODUCTS = {
    "berry-cream-dessert-box": {
        "id": "berry-cream-dessert-box",
        "name": "Berry Cream Dessert Box",
        "subtitle": "Fresh dessert collection",
        "origin": "Korea",
        "maker": "Sejin Bakery Lab",
        "series": "Daily Treat",
        "price": 33440,
        "original_price": 38000,
        "discount_rate": 12,
        "delivery_fee": 2500,
        "free_delivery_minimum": 50000,
        "options": {
            "sizes": ["Small", "Regular", "Large"],
            "add_ons": ["Gift wrapping", "Message card"],
        },
    }
}

orders: dict[str, dict] = {}


class Product(BaseModel):
    id: str
    name: str
    subtitle: str
    origin: str
    maker: str
    series: str
    price: int
    original_price: int
    discount_rate: int
    delivery_fee: int
    free_delivery_minimum: int
    options: dict[str, list[str]]


class Buyer(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    customs_id: str = Field(min_length=13, max_length=13)
    mobile: str = Field(min_length=10, max_length=20)
    email: str = Field(min_length=5, max_length=120)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")
        return value


class Recipient(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    mobile: str = Field(min_length=10, max_length=20)
    alt_phone: str | None = Field(default=None, max_length=20)
    postal_code: str = Field(min_length=3, max_length=12)
    address1: str = Field(min_length=1, max_length=200)
    address2: str = Field(default="", max_length=200)
    delivery_note: str = Field(default="", max_length=300)


class OrderItem(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1, le=20)
    size: Literal["Small", "Regular", "Large"]
    add_ons: list[Literal["Gift wrapping", "Message card"]] = Field(default_factory=list)


class Agreements(BaseModel):
    guest_privacy: bool
    privacy_policy: bool
    terms_of_service: bool

    def require_all(self) -> None:
        if not all((self.guest_privacy, self.privacy_policy, self.terms_of_service)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All required agreements must be accepted.",
            )


class OrderCreate(BaseModel):
    buyer: Buyer
    recipient: Recipient
    items: list[OrderItem] = Field(min_length=1)
    payment_method: Literal[
        "Card",
        "Mobile Pay",
        "Bank Transfer",
        "Virtual Account",
        "Manual Approval",
    ]
    agreements: Agreements


class OrderTotals(BaseModel):
    items: int
    delivery: int
    discount: int
    total: int


class OrderResponse(BaseModel):
    id: str
    status: Literal["pending_payment", "paid", "cancelled"]
    buyer: Buyer
    recipient: Recipient
    items: list[OrderItem]
    payment_method: str
    totals: OrderTotals
    created_at: datetime


class CustomsCheck(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    mobile: str = Field(min_length=10, max_length=20)
    address: str = Field(min_length=1, max_length=240)
    customs_id: str = Field(min_length=13, max_length=13)


class CustomsCheckResult(BaseModel):
    valid: bool
    message: str


def calculate_totals(items: list[OrderItem]) -> OrderTotals:
    item_total = 0

    for item in items:
        product = PRODUCTS.get(item.product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{item.product_id}' was not found.",
            )
        item_total += product["price"] * item.quantity

    delivery_fee = 0 if item_total >= PRODUCTS["berry-cream-dessert-box"]["free_delivery_minimum"] else 2500
    discount = 2000 if sum(item.quantity for item in items) >= 2 else 0

    return OrderTotals(
        items=item_total,
        delivery=delivery_fee,
        discount=discount,
        total=item_total + delivery_fee - discount,
    )


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "sejin-store-api"}


@app.get("/api/products/{product_id}", response_model=Product)
def get_product(product_id: str) -> dict:
    product = PRODUCTS.get(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return product


@app.post("/api/customs/verify", response_model=CustomsCheckResult)
def verify_customs_id(payload: CustomsCheck) -> CustomsCheckResult:
    normalized = payload.customs_id.upper()
    is_valid = normalized.startswith("P") and normalized[1:].isdigit()

    if not is_valid:
        return CustomsCheckResult(
            valid=False,
            message="Customs ID must start with P followed by 12 digits.",
        )

    return CustomsCheckResult(valid=True, message="Customs ID format is valid.")


@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate) -> OrderResponse:
    payload.agreements.require_all()

    order_id = f"ord_{uuid4().hex[:12]}"
    order = OrderResponse(
        id=order_id,
        status="pending_payment",
        buyer=payload.buyer,
        recipient=payload.recipient,
        items=payload.items,
        payment_method=payload.payment_method,
        totals=calculate_totals(payload.items),
        created_at=datetime.now(timezone.utc),
    )

    orders[order_id] = order.model_dump()
    return order


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: str) -> dict:
    order = orders.get(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order
