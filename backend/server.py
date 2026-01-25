from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

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

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reference: str
    name: str
    price: float
    stock: str  # "En stock" | "Sur commande (24-72h)" | "Rupture"
    category: Optional[str] = None
    vehicle: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    reference: str
    name: str
    price: float
    stock: str
    category: Optional[str] = None
    vehicle: Optional[str] = None

class ProductUpdate(BaseModel):
    reference: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[str] = None
    category: Optional[str] = None
    vehicle: Optional[str] = None

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
async def get_products(search: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"reference": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"vehicle": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
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
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}

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

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "ALLO PIECES 76 API - Bienvenue!"}

# Include the router in the main app
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
