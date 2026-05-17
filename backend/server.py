from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import secrets
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

from utils.file_handler import save_image, save_pdf, save_logo, delete_file_by_url, UPLOADS_DIR
from utils.csv_handler import parse_csv, generate_error_report_csv, generate_template_csv, detect_mapping

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'allo_pieces_76_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="ALLO PIECES 76 API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminUserCreate(BaseModel):
    email: str
    password: str

class AdminUserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProductImage(BaseModel):
    id: str
    url: str
    thumbnail_url: str
    filename: Optional[str] = None
    alt: Optional[str] = None

class ProductPDF(BaseModel):
    id: str
    url: str
    filename: Optional[str] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reference: str
    name: str
    price: float
    stock: str  # "En stock" | "Sur commande (24-72h)" | "Rupture"
    category: Optional[str] = None
    vehicle: Optional[str] = None
    description: Optional[str] = None
    images: List[ProductImage] = []
    pdf: Optional[ProductPDF] = None
    featured: bool = False
    featured_order: int = 0
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    reference: str
    name: str
    price: float
    stock: str
    category: Optional[str] = None
    vehicle: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[ProductImage]] = None
    pdf: Optional[ProductPDF] = None

class ProductUpdate(BaseModel):
    reference: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[str] = None
    category: Optional[str] = None
    vehicle: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[ProductImage]] = None
    pdf: Optional[ProductPDF] = None
    featured: Optional[bool] = None
    featured_order: Optional[int] = None

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    amount: float
    currency: str = "eur"
    payment_status: str = "pending"
    metadata: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateCheckoutRequest(BaseModel):
    amount: float
    description: Optional[str] = None
    origin_url: str

class ProCodeValidation(BaseModel):
    code: str

class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    plate_or_vin: str
    part_description: str
    status: str = "pending"  # pending, processed, quoted, rejected
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteRequestCreate(BaseModel):
    name: str
    email: str
    phone: str
    plate_or_vin: str
    part_description: str

class QuoteStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None

# ----- Phase 2 Models -----

class Promotion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    link: Optional[str] = None
    badge: Optional[str] = None  # e.g. "-20%", "NOUVEAU"
    active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    order: int = 0
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromotionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    link: Optional[str] = None
    badge: Optional[str] = None
    active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    order: int = 0

class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link: Optional[str] = None
    badge: Optional[str] = None
    active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    order: Optional[int] = None

class QuickLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    icon: str = "link"  # phone, whatsapp, mail, external, leboncoin, instagram, facebook
    url: str
    link_type: str = "url"  # phone, whatsapp, mail, url
    active: bool = True
    order: int = 0
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuickLinkCreate(BaseModel):
    label: str
    icon: str = "link"
    url: str
    link_type: str = "url"
    active: bool = True
    order: int = 0

class QuickLinkUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    url: Optional[str] = None
    link_type: Optional[str] = None
    active: Optional[bool] = None
    order: Optional[int] = None

class QuickLinksReorder(BaseModel):
    ids: List[str]

class FeatureToggle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str  # unique identifier
    label: str
    enabled: bool = True
    description: Optional[str] = None

class FeatureToggleUpdate(BaseModel):
    enabled: bool

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    logo_url: Optional[str] = None
    logo_animation_enabled: bool = True
    logo_animation_type: str = "pulse"  # pulse, slide-in, none
    brand_primary_color: str = "#dc2626"
    brand_accent_color: str = "#f59e0b"
    contact_email: str = "allopiece27@gmail.com"
    contact_phone: str = "0232510433"
    contact_whatsapp: str = "+33686721372"

class SiteSettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    logo_animation_enabled: Optional[bool] = None
    logo_animation_type: Optional[str] = None
    brand_primary_color: Optional[str] = None
    brand_accent_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None

class ProRegistration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    garage_name: str
    contact_name: str
    phone: str
    email: str
    address: Optional[str] = None
    delivery_address: Optional[str] = None
    siret: Optional[str] = None
    activity: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProRegistrationCreate(BaseModel):
    garage_name: str
    contact_name: str
    phone: str
    email: str
    address: Optional[str] = None
    delivery_address: Optional[str] = None
    siret: Optional[str] = None
    activity: Optional[str] = None
    notes: Optional[str] = None

class ProRegistrationStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_email: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    summary: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class CSVImportConfirm(BaseModel):
    rows: List[Dict[str, Any]]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        admin = await db.admin_users.find_one({"email": email}, {"_id": 0})
        if admin is None:
            raise HTTPException(status_code=401, detail="Admin non trouvé")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_admin(user: AdminUserCreate):
    existing = await db.admin_users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    admin = AdminUser(
        email=user.email,
        password_hash=hash_password(user.password)
    )
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admin_users.insert_one(doc)
    
    access_token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=access_token)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_admin(user: AdminUserLogin):
    admin = await db.admin_users.find_one({"email": user.email}, {"_id": 0})
    if not admin or not verify_password(user.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    access_token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=access_token)

@api_router.get("/auth/me")
async def get_current_admin_info(admin: dict = Depends(get_current_admin)):
    return {"email": admin["email"]}

# ==================== PRODUCT ROUTES ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(search: Optional[str] = None, category: Optional[str] = None, featured: Optional[bool] = None):
    query = {"is_deleted": {"$ne": True}}
    if search:
        query["$or"] = [
            {"reference": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"vehicle": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    if featured is True:
        query["featured"] = True

    sort_spec = [("featured", -1), ("featured_order", 1), ("created_at", -1)]
    products = await db.products.find(query, {"_id": 0}).sort(sort_spec).to_list(2000)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    if isinstance(product.get('updated_at'), str):
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, admin: dict = Depends(get_current_admin)):
    new_product = Product(**product.model_dump())
    doc = new_product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.products.insert_one(doc)
    return new_product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    await db.products.update_one(
        {"id": product_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await log_action(admin["email"], "delete", "product", product_id, f"Suppression produit '{existing.get('name','')}'")
    return {"message": "Produit supprimé (corbeille)"}

@api_router.post("/products/{product_id}/restore")
async def restore_product(product_id: str, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_deleted": False, "deleted_at": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_action(admin["email"], "restore", "product", product_id, f"Restauration produit '{existing.get('name','')}'")
    return {"message": "Produit restauré"}

@api_router.delete("/products/{product_id}/permanent")
async def permanently_delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    # cleanup files
    for img in (existing.get("images") or []):
        if img.get("url"):
            delete_file_by_url(img["url"])
    if existing.get("pdf", {}).get("url"):
        delete_file_by_url(existing["pdf"]["url"])
    await db.products.delete_one({"id": product_id})
    await log_action(admin["email"], "delete_permanent", "product", product_id, f"Suppression définitive '{existing.get('name','')}'")
    return {"message": "Produit supprimé définitivement"}

@api_router.get("/products/trash/list", response_model=List[Product])
async def list_trashed_products(admin: dict = Depends(get_current_admin)):
    products = await db.products.find({"is_deleted": True}, {"_id": 0}).sort("deleted_at", -1).to_list(1000)
    for p in products:
        for fld in ("created_at", "updated_at", "deleted_at"):
            if isinstance(p.get(fld), str):
                p[fld] = datetime.fromisoformat(p[fld])
    return products

@api_router.post("/products/{product_id}/pin")
async def pin_product(product_id: str, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    new_state = not bool(existing.get("featured", False))
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"featured": new_state, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_action(admin["email"], "pin" if new_state else "unpin", "product", product_id, f"Produit '{existing.get('name','')}' {'épinglé' if new_state else 'désépinglé'}")
    return {"featured": new_state}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/checkout")
async def create_checkout_session(request: CreateCheckoutRequest, http_request: Request):
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à 0")
    
    host_url = str(http_request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/payment-cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(request.amount),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "source": "allo_pieces_76",
            "description": request.description or "Paiement ALLO PIECES 76"
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        session_id=session.session_id,
        amount=float(request.amount),
        currency="eur",
        payment_status="pending",
        metadata={"description": request.description or "Paiement ALLO PIECES 76"}
    )
    doc = transaction.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.payment_transactions.insert_one(doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    host_url = str(http_request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction in database
    new_status = "paid" if status.payment_status == "paid" else status.payment_status
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.session_id:
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== PRO ACCESS ROUTE ====================

PRO_ACCESS_CODE = "jossanpb09"

@api_router.post("/pro/validate")
async def validate_pro_code(data: ProCodeValidation):
    if data.code == PRO_ACCESS_CODE:
        return {"valid": True, "message": "Accès autorisé"}
    return {"valid": False, "message": "Code incorrect"}

# ==================== QUOTE/DEVIS ROUTES ====================

ADMIN_EMAIL = "allopiece27@gmail.com"

@api_router.post("/quotes")
async def create_quote(quote: QuoteRequestCreate):
    """Create a new quote request"""
    new_quote = QuoteRequest(**quote.model_dump())
    doc = new_quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.quotes.insert_one(doc)
    
    logger.info(f"New quote request from {quote.name} ({quote.email}) - Plate/VIN: {quote.plate_or_vin}")
    
    return {
        "success": True,
        "message": "Votre demande de devis a été envoyée avec succès. Nous vous répondrons rapidement.",
        "quote_id": new_quote.id
    }

@api_router.get("/quotes", response_model=List[QuoteRequest])
async def get_quotes(status: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    """Get all quote requests (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for q in quotes:
        if isinstance(q.get('created_at'), str):
            q['created_at'] = datetime.fromisoformat(q['created_at'])
        if isinstance(q.get('updated_at'), str):
            q['updated_at'] = datetime.fromisoformat(q['updated_at'])
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=QuoteRequest)
async def get_quote(quote_id: str, admin: dict = Depends(get_current_admin)):
    """Get a specific quote request (admin only)"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    if isinstance(quote.get('created_at'), str):
        quote['created_at'] = datetime.fromisoformat(quote['created_at'])
    if isinstance(quote.get('updated_at'), str):
        quote['updated_at'] = datetime.fromisoformat(quote['updated_at'])
    return quote

@api_router.put("/quotes/{quote_id}")
async def update_quote_status(quote_id: str, update: QuoteStatusUpdate, admin: dict = Depends(get_current_admin)):
    """Update quote status (admin only)"""
    existing = await db.quotes.find_one({"id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    update_data = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if update.admin_notes is not None:
        update_data["admin_notes"] = update.admin_notes
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    
    return {"success": True, "message": "Devis mis à jour"}

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a quote request (admin only)"""
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return {"message": "Devis supprimé"}

@api_router.get("/quotes/stats/summary")
async def get_quotes_stats(admin: dict = Depends(get_current_admin)):
    """Get quote statistics (admin only)"""
    total = await db.quotes.count_documents({})
    pending = await db.quotes.count_documents({"status": "pending"})
    processed = await db.quotes.count_documents({"status": "processed"})
    quoted = await db.quotes.count_documents({"status": "quoted"})
    
    return {
        "total": total,
        "pending": pending,
        "processed": processed,
        "quoted": quoted
    }

# ==================== CATEGORIES ROUTE ====================

@api_router.get("/categories")
async def get_categories():
    return [
        {"id": "carrosserie", "name": "Carrosserie", "icon": "car"},
        {"id": "eclairage", "name": "Éclairage", "icon": "lightbulb"},
        {"id": "retroviseur", "name": "Rétroviseur", "icon": "eye"},
        {"id": "refroidissement", "name": "Refroidissement", "icon": "thermometer"},
        {"id": "mecanique", "name": "Mécanique/Entretien", "icon": "wrench"},
        {"id": "accessoires", "name": "Accessoires", "icon": "settings"}
    ]

# ==================== AUDIT HELPER ====================

async def log_action(admin_email: str, action: str, target_type: str, target_id: Optional[str], summary: str):
    """Insert an audit log entry."""
    try:
        log = AuditLog(
            admin_email=admin_email,
            action=action,
            target_type=target_type,
            target_id=target_id,
            summary=summary
        )
        doc = log.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.audit_logs.insert_one(doc)
    except Exception as e:
        logger.warning(f"Audit log failed: {e}")

# ==================== FILE UPLOADS ====================

@api_router.post("/admin/upload/images")
async def upload_product_images(files: List[UploadFile] = File(...), admin: dict = Depends(get_current_admin)):
    """Upload one or more product images. Returns list of {id, url, thumbnail_url}."""
    if not files:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images par envoi")
    results = []
    for f in files:
        result = await save_image(f, subdir="products")
        results.append(result)
    await log_action(admin["email"], "upload_image", "image", None, f"Upload de {len(results)} image(s)")
    return {"images": results}

@api_router.post("/admin/upload/pdf")
async def upload_pdf(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    result = await save_pdf(file)
    await log_action(admin["email"], "upload_pdf", "pdf", result["id"], f"Upload PDF '{file.filename}'")
    return result

@api_router.post("/admin/upload/logo")
async def upload_logo_endpoint(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    result = await save_logo(file)
    # Update site settings
    await db.site_settings.update_one(
        {"_singleton": "main"},
        {"$set": {"logo_url": result["url"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    await log_action(admin["email"], "upload_logo", "logo", result["id"], "Nouveau logo téléversé")
    return result

@api_router.post("/admin/upload/promotion-image")
async def upload_promotion_image(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    result = await save_image(file, subdir="promotions")
    return result

# ==================== CSV IMPORT ====================

@api_router.get("/admin/products/csv-template")
async def get_csv_template(admin: dict = Depends(get_current_admin)):
    """Download CSV template for product import."""
    content = generate_template_csv()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=template-produits-allopieces76.csv"}
    )

@api_router.post("/admin/products/csv-preview")
async def csv_import_preview(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    """Parse CSV and return preview (valid rows + errors) without inserting."""
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier CSV trop volumineux (max 5 Mo)")
    try:
        valid_rows, errors, mapping = parse_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # check existing references in DB to flag would-be duplicates
    existing_refs = set()
    if valid_rows:
        refs = [r["reference"] for r in valid_rows]
        cursor = db.products.find({"reference": {"$in": refs}, "is_deleted": {"$ne": True}}, {"_id": 0, "reference": 1})
        async for d in cursor:
            existing_refs.add(d["reference"])

    for r in valid_rows:
        r["already_exists"] = r["reference"] in existing_refs

    return {
        "mapping": mapping,
        "total_lines": len(valid_rows) + len(errors),
        "valid_count": len(valid_rows),
        "error_count": len(errors),
        "existing_count": sum(1 for r in valid_rows if r.get("already_exists")),
        "rows": valid_rows[:500],  # limit preview
        "errors": errors[:500]
    }

@api_router.post("/admin/products/csv-import-confirm")
async def csv_import_confirm(payload: CSVImportConfirm, admin: dict = Depends(get_current_admin)):
    """Confirm import of pre-validated rows. Upserts by reference."""
    rows = payload.rows
    if not rows:
        raise HTTPException(status_code=400, detail="Aucune ligne à importer")
    if len(rows) > 5000:
        raise HTTPException(status_code=400, detail="Limite 5000 lignes par import")

    inserted = 0
    updated = 0
    failed = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    # Process in batches of 200
    for i in range(0, len(rows), 200):
        batch = rows[i:i+200]
        for r in batch:
            try:
                ref = r.get("reference")
                if not ref:
                    failed += 1
                    continue
                existing = await db.products.find_one({"reference": ref}, {"_id": 0, "id": 1})
                doc_data = {
                    "name": r.get("name"),
                    "price": float(r.get("price", 0)),
                    "stock": r.get("stock") or "En stock",
                    "category": r.get("category") or None,
                    "vehicle": r.get("vehicle") or None,
                    "updated_at": now_iso,
                    "is_deleted": False
                }
                if existing:
                    await db.products.update_one({"reference": ref}, {"$set": doc_data})
                    updated += 1
                else:
                    new_doc = {
                        "id": str(uuid.uuid4()),
                        "reference": ref,
                        "images": [],
                        "pdf": None,
                        "featured": False,
                        "featured_order": 0,
                        "is_deleted": False,
                        "created_at": now_iso,
                        **doc_data
                    }
                    await db.products.insert_one(new_doc)
                    inserted += 1
            except Exception as e:
                logger.warning(f"CSV row failed: {e}")
                failed += 1

    await log_action(admin["email"], "csv_import", "product", None, f"Import CSV: {inserted} créés, {updated} mis à jour, {failed} échecs")
    return {"inserted": inserted, "updated": updated, "failed": failed}

@api_router.post("/admin/products/csv-error-report")
async def csv_error_report(errors: List[Dict[str, Any]], admin: dict = Depends(get_current_admin)):
    """Download error report as CSV."""
    content = generate_error_report_csv(errors)
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rapport-erreurs-import.csv"}
    )

# ==================== PROMOTIONS ====================

@api_router.get("/promotions")
async def list_active_promotions():
    """Public: get active, non-deleted, within-date promotions."""
    now = datetime.now(timezone.utc).isoformat()
    query = {"active": True, "is_deleted": {"$ne": True}}
    items = await db.promotions.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    filtered = []
    for p in items:
        sd = p.get("start_date")
        ed = p.get("end_date")
        if sd and isinstance(sd, str) and sd > now:
            continue
        if ed and isinstance(ed, str) and ed < now:
            continue
        filtered.append(p)
    return filtered

@api_router.get("/admin/promotions")
async def list_all_promotions(admin: dict = Depends(get_current_admin)):
    items = await db.promotions.find({"is_deleted": {"$ne": True}}, {"_id": 0}).sort("order", 1).to_list(500)
    return items

@api_router.post("/admin/promotions")
async def create_promotion(promo: PromotionCreate, admin: dict = Depends(get_current_admin)):
    new = Promotion(**promo.model_dump())
    doc = new.model_dump()
    for k in ("created_at", "updated_at", "start_date", "end_date"):
        if doc.get(k) and isinstance(doc[k], datetime):
            doc[k] = doc[k].isoformat()
    await db.promotions.insert_one(doc)
    await log_action(admin["email"], "create", "promotion", new.id, f"Création promo '{new.title}'")
    return new

@api_router.put("/admin/promotions/{promo_id}")
async def update_promotion(promo_id: str, update: PromotionUpdate, admin: dict = Depends(get_current_admin)):
    existing = await db.promotions.find_one({"id": promo_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    for k in ("start_date", "end_date"):
        if k in data and isinstance(data[k], datetime):
            data[k] = data[k].isoformat()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.promotions.update_one({"id": promo_id}, {"$set": data})
    await log_action(admin["email"], "update", "promotion", promo_id, f"Mise à jour promo '{existing.get('title','')}'")
    return {"success": True}

@api_router.delete("/admin/promotions/{promo_id}")
async def delete_promotion(promo_id: str, admin: dict = Depends(get_current_admin)):
    existing = await db.promotions.find_one({"id": promo_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    await db.promotions.update_one(
        {"id": promo_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_action(admin["email"], "delete", "promotion", promo_id, f"Suppression promo '{existing.get('title','')}'")
    return {"success": True}

# ==================== QUICK LINKS ====================

@api_router.get("/quicklinks")
async def list_active_quicklinks():
    """Public endpoint."""
    items = await db.quicklinks.find({"active": True, "is_deleted": {"$ne": True}}, {"_id": 0}).sort("order", 1).to_list(100)
    return items

@api_router.get("/admin/quicklinks")
async def list_all_quicklinks(admin: dict = Depends(get_current_admin)):
    items = await db.quicklinks.find({"is_deleted": {"$ne": True}}, {"_id": 0}).sort("order", 1).to_list(500)
    return items

@api_router.post("/admin/quicklinks")
async def create_quicklink(payload: QuickLinkCreate, admin: dict = Depends(get_current_admin)):
    new = QuickLink(**payload.model_dump())
    doc = new.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.quicklinks.insert_one(doc)
    await log_action(admin["email"], "create", "quicklink", new.id, f"Lien '{new.label}' ajouté")
    return new

@api_router.put("/admin/quicklinks/{link_id}")
async def update_quicklink(link_id: str, update: QuickLinkUpdate, admin: dict = Depends(get_current_admin)):
    existing = await db.quicklinks.find_one({"id": link_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Lien non trouvé")
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.quicklinks.update_one({"id": link_id}, {"$set": data})
    await log_action(admin["email"], "update", "quicklink", link_id, f"Lien '{existing.get('label','')}' modifié")
    return {"success": True}

@api_router.delete("/admin/quicklinks/{link_id}")
async def delete_quicklink(link_id: str, admin: dict = Depends(get_current_admin)):
    existing = await db.quicklinks.find_one({"id": link_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Lien non trouvé")
    await db.quicklinks.update_one({"id": link_id}, {"$set": {"is_deleted": True}})
    await log_action(admin["email"], "delete", "quicklink", link_id, f"Lien '{existing.get('label','')}' supprimé")
    return {"success": True}

@api_router.post("/admin/quicklinks/reorder")
async def reorder_quicklinks(payload: QuickLinksReorder, admin: dict = Depends(get_current_admin)):
    for idx, link_id in enumerate(payload.ids):
        await db.quicklinks.update_one({"id": link_id}, {"$set": {"order": idx}})
    await log_action(admin["email"], "reorder", "quicklink", None, f"Réordonnancement de {len(payload.ids)} liens")
    return {"success": True}

# ==================== FEATURE TOGGLES ====================

DEFAULT_FEATURE_TOGGLES = [
    {"key": "show_logo", "label": "Afficher le logo", "enabled": True, "description": "Affiche le logo dans l'en-tête"},
    {"key": "logo_animation", "label": "Animation du logo", "enabled": True, "description": "Active une animation subtile sur le logo"},
    {"key": "show_whatsapp", "label": "Bouton WhatsApp Pro", "enabled": True, "description": "Affiche le bouton WhatsApp pour les pros"},
    {"key": "show_leboncoin", "label": "Lien Leboncoin", "enabled": True, "description": "Affiche le lien vers la boutique Leboncoin"},
    {"key": "show_stripe_payment", "label": "Paiement Stripe en ligne", "enabled": True, "description": "Active le paiement en ligne via Stripe"},
    {"key": "show_pro_registration", "label": "Formulaire inscription Pro", "enabled": True, "description": "Affiche le formulaire d'inscription pour garages/pros"},
    {"key": "show_promotions", "label": "Bannière promotions", "enabled": True, "description": "Affiche les promotions actives en homepage"},
    {"key": "show_faq", "label": "Section FAQ", "enabled": True, "description": "Affiche la FAQ sur la page d'accueil"},
    {"key": "show_why_choose_us", "label": "Section 'Pourquoi nous choisir'", "enabled": True, "description": "Affiche la section expertise"},
    {"key": "show_featured_products", "label": "Produits vedettes", "enabled": True, "description": "Affiche les produits épinglés en avant"}
]

@api_router.get("/feature-toggles")
async def get_public_toggles():
    """Public: returns dict of key -> enabled."""
    docs = await db.feature_toggles.find({}, {"_id": 0}).to_list(100)
    result = {}
    for d in docs:
        result[d["key"]] = bool(d.get("enabled", True))
    # Ensure defaults are present
    for ft in DEFAULT_FEATURE_TOGGLES:
        result.setdefault(ft["key"], ft["enabled"])
    return result

@api_router.get("/admin/feature-toggles")
async def get_admin_toggles(admin: dict = Depends(get_current_admin)):
    docs = await db.feature_toggles.find({}, {"_id": 0}).to_list(100)
    existing_keys = {d["key"] for d in docs}
    # Add any defaults missing
    for ft in DEFAULT_FEATURE_TOGGLES:
        if ft["key"] not in existing_keys:
            docs.append(ft)
    docs.sort(key=lambda x: x["label"])
    return docs

@api_router.put("/admin/feature-toggles/{key}")
async def update_toggle(key: str, update: FeatureToggleUpdate, admin: dict = Depends(get_current_admin)):
    default = next((ft for ft in DEFAULT_FEATURE_TOGGLES if ft["key"] == key), None)
    if not default and not await db.feature_toggles.find_one({"key": key}):
        raise HTTPException(status_code=404, detail="Option inconnue")
    label = default["label"] if default else key
    description = default.get("description") if default else None
    await db.feature_toggles.update_one(
        {"key": key},
        {"$set": {"key": key, "enabled": update.enabled, "label": label, "description": description}},
        upsert=True
    )
    await log_action(admin["email"], "toggle", "feature", key, f"Option '{label}' = {'ON' if update.enabled else 'OFF'}")
    return {"success": True, "key": key, "enabled": update.enabled}

# ==================== SITE SETTINGS ====================

DEFAULT_SETTINGS = {
    "logo_url": None,
    "logo_animation_enabled": True,
    "logo_animation_type": "pulse",
    "brand_primary_color": "#dc2626",
    "brand_accent_color": "#f59e0b",
    "contact_email": "allopiece27@gmail.com",
    "contact_phone": "0232510433",
    "contact_whatsapp": "+33686721372"
}

@api_router.get("/settings")
async def get_public_settings():
    """Public site settings (logo, animation, colors, contacts)."""
    doc = await db.site_settings.find_one({"_singleton": "main"}, {"_id": 0, "_singleton": 0}) or {}
    result = dict(DEFAULT_SETTINGS)
    result.update({k: v for k, v in doc.items() if v is not None})
    return result

@api_router.put("/admin/settings")
async def update_site_settings(update: SiteSettingsUpdate, admin: dict = Depends(get_current_admin)):
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_settings.update_one({"_singleton": "main"}, {"$set": data}, upsert=True)
    await log_action(admin["email"], "update", "settings", None, f"Paramètres modifiés: {', '.join(data.keys())}")
    return {"success": True}

# ==================== PRO REGISTRATIONS ====================

@api_router.post("/pro-registrations")
async def create_pro_registration(payload: ProRegistrationCreate):
    """Public: garage/pro submits registration request."""
    new = ProRegistration(**payload.model_dump())
    doc = new.model_dump()
    for k in ("created_at", "updated_at"):
        doc[k] = doc[k].isoformat()
    await db.pro_registrations.insert_one(doc)
    logger.info(f"Pro registration: {new.garage_name} ({new.email})")
    # Build WhatsApp link template for admin notification (returned to caller for one-click forward)
    wa_text = f"Nouvelle inscription PRO:\nGarage: {new.garage_name}\nContact: {new.contact_name}\nTel: {new.phone}\nEmail: {new.email}"
    return {
        "success": True,
        "id": new.id,
        "message": "Votre demande a bien été reçue. Nous vous contacterons rapidement.",
        "whatsapp_notification_url": f"https://wa.me/?text={wa_text.replace(chr(10), '%0A').replace(' ', '%20')}"
    }

@api_router.get("/admin/pro-registrations", response_model=List[ProRegistration])
async def list_pro_registrations(status: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    items = await db.pro_registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for i in items:
        for k in ("created_at", "updated_at"):
            if isinstance(i.get(k), str):
                i[k] = datetime.fromisoformat(i[k])
    return items

@api_router.put("/admin/pro-registrations/{reg_id}")
async def update_pro_registration_status(reg_id: str, update: ProRegistrationStatusUpdate, admin: dict = Depends(get_current_admin)):
    existing = await db.pro_registrations.find_one({"id": reg_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    await db.pro_registrations.update_one(
        {"id": reg_id},
        {"$set": {
            "status": update.status,
            "admin_notes": update.admin_notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await log_action(admin["email"], "update", "pro_registration", reg_id, f"{existing.get('garage_name','')} → {update.status}")
    return {"success": True}

@api_router.delete("/admin/pro-registrations/{reg_id}")
async def delete_pro_registration(reg_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.pro_registrations.delete_one({"id": reg_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    await log_action(admin["email"], "delete", "pro_registration", reg_id, "Inscription supprimée")
    return {"success": True}

# ==================== FORGOT PASSWORD ====================

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Generate a reset token. In dev mode, returns token directly (no email service)."""
    admin = await db.admin_users.find_one({"email": payload.email}, {"_id": 0})
    if not admin:
        # Don't reveal whether email exists
        return {"success": True, "message": "Si cet email existe, un lien de réinitialisation a été généré."}

    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    await db.password_reset_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "token": token,
        "expires_at": expires,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # In real implementation, send email here.
    # For now, return token so admin can copy/paste (since email is not configured yet)
    return {
        "success": True,
        "message": "Lien de réinitialisation généré. Conservez ce code en sécurité.",
        "reset_token": token,
        "expires_in_hours": 2
    }

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min 6 caractères)")
    record = await db.password_reset_tokens.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="Token invalide ou déjà utilisé")
    expires = record.get("expires_at")
    if expires and datetime.fromisoformat(expires) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expiré")

    await db.admin_users.update_one(
        {"email": record["email"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"success": True, "message": "Mot de passe réinitialisé."}

# ==================== AUDIT LOG ====================

@api_router.get("/admin/audit-log")
async def get_audit_log(limit: int = 100, admin: dict = Depends(get_current_admin)):
    items = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(min(limit, 500))
    for i in items:
        if isinstance(i.get("timestamp"), str):
            i["timestamp"] = datetime.fromisoformat(i["timestamp"])
    return items

# ==================== ANALYTICS ====================

@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(get_current_admin)):
    total_products = await db.products.count_documents({"is_deleted": {"$ne": True}})
    trashed_products = await db.products.count_documents({"is_deleted": True})
    featured_products = await db.products.count_documents({"featured": True, "is_deleted": {"$ne": True}})
    in_stock = await db.products.count_documents({"stock": "En stock", "is_deleted": {"$ne": True}})
    on_order = await db.products.count_documents({"stock": "Sur commande (24-72h)", "is_deleted": {"$ne": True}})
    out_of_stock = await db.products.count_documents({"stock": "Rupture", "is_deleted": {"$ne": True}})

    total_quotes = await db.quotes.count_documents({})
    pending_quotes = await db.quotes.count_documents({"status": "pending"})
    total_promos = await db.promotions.count_documents({"is_deleted": {"$ne": True}})
    active_promos = await db.promotions.count_documents({"active": True, "is_deleted": {"$ne": True}})
    total_pro_reqs = await db.pro_registrations.count_documents({})
    pending_pro = await db.pro_registrations.count_documents({"status": "pending"})

    # Recent actions (last 10)
    recent = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
    for r in recent:
        if isinstance(r.get("timestamp"), str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])

    # Upload count: estimate from product images & pdfs
    products = await db.products.find({}, {"_id": 0, "images": 1, "pdf": 1}).to_list(5000)
    image_count = sum(len(p.get("images") or []) for p in products)
    pdf_count = sum(1 for p in products if p.get("pdf"))

    return {
        "products": {
            "total": total_products,
            "trashed": trashed_products,
            "featured": featured_products,
            "in_stock": in_stock,
            "on_order": on_order,
            "out_of_stock": out_of_stock
        },
        "uploads": {
            "images": image_count,
            "pdfs": pdf_count
        },
        "quotes": {
            "total": total_quotes,
            "pending": pending_quotes
        },
        "promotions": {
            "total": total_promos,
            "active": active_promos
        },
        "pro_registrations": {
            "total": total_pro_reqs,
            "pending": pending_pro
        },
        "recent_actions": recent
    }

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "ALLO PIECES 76 API - Bienvenue!"}

# Include the router in the main app
app.include_router(api_router)

# Mount uploads directory for serving static files
UPLOADS_PATH = Path(__file__).parent / "uploads"
UPLOADS_PATH.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_PATH)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Seed demo products if none exist
    count = await db.products.count_documents({})
    if count == 0:
        demo_products = [
            {"id": str(uuid.uuid4()), "reference": "PC-CLIO4-AV", "name": "Pare-choc avant Renault Clio 4", "price": 89.90, "stock": "En stock", "category": "carrosserie", "vehicle": "Renault Clio 4"},
            {"id": str(uuid.uuid4()), "reference": "PH-208-AVG", "name": "Phare avant gauche Peugeot 208", "price": 125.00, "stock": "En stock", "category": "eclairage", "vehicle": "Peugeot 208"},
            {"id": str(uuid.uuid4()), "reference": "RV-GOLF7-D", "name": "Rétroviseur droit VW Golf 7", "price": 75.50, "stock": "Sur commande (24-72h)", "category": "retroviseur", "vehicle": "Volkswagen Golf 7"},
            {"id": str(uuid.uuid4()), "reference": "RAD-C3-1.4", "name": "Radiateur Citroën C3 1.4 HDi", "price": 149.00, "stock": "En stock", "category": "refroidissement", "vehicle": "Citroën C3"},
            {"id": str(uuid.uuid4()), "reference": "FO-MEGANE3", "name": "Filtre à huile Renault Mégane 3", "price": 12.90, "stock": "En stock", "category": "mecanique", "vehicle": "Renault Mégane 3"},
            {"id": str(uuid.uuid4()), "reference": "PC-308-AR", "name": "Pare-choc arrière Peugeot 308", "price": 115.00, "stock": "En stock", "category": "carrosserie", "vehicle": "Peugeot 308"},
            {"id": str(uuid.uuid4()), "reference": "FEU-POLO-ARD", "name": "Feu arrière droit VW Polo", "price": 68.00, "stock": "Sur commande (24-72h)", "category": "eclairage", "vehicle": "Volkswagen Polo"},
            {"id": str(uuid.uuid4()), "reference": "CAP-206-AV", "name": "Capot avant Peugeot 206", "price": 195.00, "stock": "En stock", "category": "carrosserie", "vehicle": "Peugeot 206"},
            {"id": str(uuid.uuid4()), "reference": "PLQ-CLIO3", "name": "Plaquettes frein avant Clio 3", "price": 35.90, "stock": "En stock", "category": "mecanique", "vehicle": "Renault Clio 3"},
            {"id": str(uuid.uuid4()), "reference": "VEN-FOCUS-2.0", "name": "Ventilateur Ford Focus 2.0", "price": 85.00, "stock": "Rupture", "category": "refroidissement", "vehicle": "Ford Focus"},
            {"id": str(uuid.uuid4()), "reference": "AILE-TWINGO", "name": "Aile avant gauche Twingo 2", "price": 55.00, "stock": "En stock", "category": "carrosserie", "vehicle": "Renault Twingo 2"},
            {"id": str(uuid.uuid4()), "reference": "LED-SCENIC", "name": "Kit LED intérieur Scenic 3", "price": 29.90, "stock": "En stock", "category": "accessoires", "vehicle": "Renault Scenic 3"},
            {"id": str(uuid.uuid4()), "reference": "RV-ASTRA-G", "name": "Rétroviseur gauche Opel Astra", "price": 62.00, "stock": "En stock", "category": "retroviseur", "vehicle": "Opel Astra"},
            {"id": str(uuid.uuid4()), "reference": "GRIL-CLIO4", "name": "Calandre avant Clio 4", "price": 45.00, "stock": "Sur commande (24-72h)", "category": "carrosserie", "vehicle": "Renault Clio 4"},
            {"id": str(uuid.uuid4()), "reference": "DISQ-MEGANE", "name": "Disques frein avant Mégane 2", "price": 59.90, "stock": "En stock", "category": "mecanique", "vehicle": "Renault Mégane 2"}
        ]
        for p in demo_products:
            p['created_at'] = datetime.now(timezone.utc).isoformat()
            p['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.products.insert_many(demo_products)
        logger.info("Demo products seeded successfully")
    
    # Create default admin if none exists
    admin_count = await db.admin_users.count_documents({})
    if admin_count == 0:
        default_admin = AdminUser(
            email="admin@allopieces76.fr",
            password_hash=hash_password("admin123")
        )
        doc = default_admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.admin_users.insert_one(doc)
        logger.info("Default admin created: admin@allopieces76.fr / admin123")

    # Seed default feature toggles if none exist
    toggles_count = await db.feature_toggles.count_documents({})
    if toggles_count == 0:
        await db.feature_toggles.insert_many([dict(ft) for ft in DEFAULT_FEATURE_TOGGLES])
        logger.info("Default feature toggles seeded")

    # Seed default quick links if none exist
    ql_count = await db.quicklinks.count_documents({})
    if ql_count == 0:
        defaults = [
            {"id": str(uuid.uuid4()), "label": "WhatsApp Pro", "icon": "whatsapp", "url": "+33686721372", "link_type": "whatsapp", "active": True, "order": 0, "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "label": "Téléphone Particuliers", "icon": "phone", "url": "0232510433", "link_type": "phone", "active": True, "order": 1, "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "label": "Boutique Leboncoin", "icon": "leboncoin", "url": "https://www.leboncoin.fr/boutique/6876238/allo_pieces_76.htm", "link_type": "url", "active": True, "order": 2, "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "label": "Email", "icon": "mail", "url": "allopiece27@gmail.com", "link_type": "mail", "active": True, "order": 3, "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.quicklinks.insert_many(defaults)
        logger.info("Default quick links seeded")

    # Seed default site settings if none exist
    settings = await db.site_settings.find_one({"_singleton": "main"})
    if not settings:
        await db.site_settings.insert_one({
            "_singleton": "main",
            **DEFAULT_SETTINGS,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Default site settings seeded")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
