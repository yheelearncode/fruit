from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from database import get_order as get_saved_order
from database import get_product as get_saved_product
from database import init_db, save_order


app = FastAPI(title="Sejin Store API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    add_ons: list[str] = Field(default_factory=list)

class Agreements(BaseModel):
    guest_privacy: bool
    privacy_policy: bool
    terms_of_service: bool

    def require_all(self) -> None:
        if not all((self.guest_privacy, self.privacy_policy, self.terms_of_service)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="모든 필수 약관에 동의해야 합니다.",
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



def calculate_totals(items: list[OrderItem]) -> OrderTotals:
    item_total = 0
    product_delivery_fees: list[int] = []
    free_delivery_minimums: list[int] = []

    for item in items:
        product = get_saved_product(item.product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{item.product_id}' was not found.",
            )
        item_total += product["price"] * item.quantity
        product_delivery_fees.append(product["delivery_fee"])
        free_delivery_minimums.append(product["free_delivery_minimum"])

    delivery_fee = (
        0
        if item_total >= max(free_delivery_minimums)
        else max(product_delivery_fees)
    )
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


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/products/{product_id}", response_model=Product)
def get_product(product_id: str) -> dict:
    product = get_saved_product(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return product



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

    save_order(order.model_dump(mode="json"))
    return order


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: str) -> dict:
    order = get_saved_order(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order
