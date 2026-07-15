from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, JSON

from .database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    gender = Column(String, nullable=False)  # "men" | "women"
    price = Column(Float, nullable=False)
    description = Column(String, nullable=False, default="")
    image_url = Column(String, nullable=True)  # uploaded photo, served from /uploads
    dial = Column(String, nullable=False, default="#121212")
    strap = Column(String, nullable=False, default="#8A8A8E")
    accent = Column(String, nullable=False, default="#C1272D")
    popularity = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)  # e.g. WV-12345678
    items = Column(JSON, nullable=False)
    total = Column(Float, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | dispatched | completed
    account_email = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
