import os
import random
import string
import shutil
import uuid
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models, schemas, security
from .notifications import send_order_whatsapp
from .database import Base, engine, get_db
from .seed import seed_products

load_dotenv()

Base.metadata.create_all(bind=engine)

OWNER_EMAIL = os.getenv("OWNER_EMAIL", "htenterprisesofficial@gmail.com")
# If OWNER_PASSWORD_HASH isn't set, we hash OWNER_PASSWORD (or the default) at startup.
OWNER_PASSWORD_HASH = os.getenv("OWNER_PASSWORD_HASH") or security.hash_password(
    os.getenv("OWNER_PASSWORD", "*htgroup*")
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Watch Valley API")

# ⚠️ TEMPORARY: the /api/owner/* endpoints below currently have NO login
# requirement — anyone who can reach this server can view/edit orders,
# accounts, and products. This was intentionally relaxed so the dashboard
# is easy to browse while you're testing. Before this goes anywhere public,
# re-add `Depends(security.require_owner)` to each /api/owner/* route below,
# and restore the login screen in watch-valley-backend.jsx.

# CORS: wide open for local development. Tighten allow_origins to your real
# storefront/backend domains before deploying this to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves uploaded product photos at http://<host>/uploads/<filename>
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    seed_products(db)


def gen_order_code() -> str:
    return "WV-" + "".join(random.choices(string.digits, k=8))


# =============================================================================
# ACCOUNTS (customer signup / login)
# =============================================================================
@app.post("/api/accounts/signup", response_model=schemas.AccountOut)
def signup(payload: schemas.SignupIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    existing = db.query(models.Account).filter(models.Account.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    account = models.Account(
        name=payload.name,
        email=email,
        password_hash=security.hash_password(payload.password),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return schemas.AccountOut(name=account.name, email=account.email)


@app.post("/api/accounts/login", response_model=schemas.AccountOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    account = db.query(models.Account).filter(models.Account.email == email).first()
    if not account or not security.verify_password(payload.password, account.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return schemas.AccountOut(name=account.name, email=account.email)


# =============================================================================
# PRODUCTS — public catalog (storefront)
# =============================================================================
@app.get("/api/products", response_model=List[schemas.ProductOut])
def list_products(gender: Optional[str] = None, q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if gender and gender != "all":
        query = query.filter(models.Product.gender == gender)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(models.Product.name.ilike(like))
    return query.order_by(models.Product.popularity.desc()).all()


# =============================================================================
# ORDERS
# =============================================================================
@app.post("/api/orders", response_model=schemas.OrderOut)
def create_order(payload: schemas.OrderCreateIn, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Your cart is empty.")
    order = models.Order(
        code=gen_order_code(),
        items=[item.model_dump() for item in payload.items],
        total=payload.total,
        name=payload.name,
        phone=payload.phone,
        address=payload.address,
        account_email=payload.account_email,
        account_name=payload.account_name,
        status="pending",
    )
    db.add(order)
    # bump popularity so best-sellers rise to the top of the storefront
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.id).first()
        if product:
            product.popularity += item.qty * 3
    db.commit()
    db.refresh(order)
    send_order_whatsapp(order)
    return order


# =============================================================================
# OWNER AUTH
# =============================================================================
@app.post("/api/owner/login", response_model=schemas.TokenOut)
def owner_login(payload: schemas.OwnerLoginIn):
    if payload.email.lower() != OWNER_EMAIL.lower() or not security.verify_password(payload.password, OWNER_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = security.create_access_token({"sub": payload.email, "role": "owner"})
    return schemas.TokenOut(access_token=token)


# =============================================================================
# OWNER — ORDERS
# =============================================================================
@app.get("/api/owner/orders", response_model=List[schemas.OrderOut])
def owner_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    return query.order_by(models.Order.created_at.desc()).all()


@app.patch("/api/owner/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(order_id: int, payload: schemas.StatusUpdateIn, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if payload.status not in ("pending", "dispatched", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status.")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


# =============================================================================
# OWNER — ACCOUNTS DIRECTORY
# =============================================================================
@app.get("/api/owner/accounts", response_model=List[schemas.AccountDirectoryOut])
def owner_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).order_by(models.Account.created_at.desc()).all()


# =============================================================================
# OWNER — PRODUCT MANAGEMENT (the "Items" tab)
# =============================================================================
@app.get("/api/owner/products", response_model=List[schemas.ProductOut])
def owner_list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()


@app.post("/api/owner/products/upload-image")
async def upload_product_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WEBP, or GIF image.")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, filename)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_url": f"/uploads/{filename}"}


@app.post("/api/owner/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreateIn, db: Session = Depends(get_db)):
    if payload.gender not in ("men", "women"):
        raise HTTPException(status_code=400, detail="Gender must be 'men' or 'women'.")
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.patch("/api/owner/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdateIn, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Item not found.")
    updates = payload.model_dump(exclude_unset=True)
    if "gender" in updates and updates["gender"] not in ("men", "women"):
        raise HTTPException(status_code=400, detail="Gender must be 'men' or 'women'.")
    for field, value in updates.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@app.delete("/api/owner/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Item not found.")
    db.delete(product)
    db.commit()
    return {"deleted": True, "id": product_id}


@app.get("/api/health")
def health():
    return {"status": "ok"}
