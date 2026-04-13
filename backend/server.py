from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import calendar
import bcrypt
import jwt
import aiofiles
import resend
import string
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ PLAN CONFIG ============
PLAN_CONFIG = {
    'monthly': {'label': 'Mensal', 'days': 30, 'multiplier': 1},
    'semester': {'label': 'Semestral', 'days': 180, 'multiplier': 6},
    'annual': {'label': 'Anual', 'days': 365, 'multiplier': 12},
}

# ============ MODELS ============

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    plan_type: str = "monthly"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    whatsapp: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"
    plan_type: str = "monthly"
    price_locked: Optional[float] = None

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    activation_date: Optional[str] = None
    subscription_expires: Optional[str] = None
    price_locked: Optional[float] = None
    plan_type: Optional[str] = None

class AdminPasswordReset(BaseModel):
    new_password: Optional[str] = None
    send_email: bool = False

class AdminBatchPricing(BaseModel):
    new_price: float
    only_increase: bool = True

class PricingUpdate(BaseModel):
    price: float
    apply_to_all: bool = False

class WarmupCreate(BaseModel):
    title: str
    description: str = ""
    content_type: str = "audio"

class PaymentCreateRequest(BaseModel):
    origin_url: str

class AdminActivateUser(BaseModel):
    subscription_expires: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def calc_subscription_expiry(plan_type='monthly', from_date=None):
    """Calcula expiração. Se faltam < 5 dias no mês, dá bônus até fim do próximo período."""
    now = from_date or datetime.now(timezone.utc)
    plan = PLAN_CONFIG.get(plan_type, PLAN_CONFIG['monthly'])
    last_day = calendar.monthrange(now.year, now.month)[1]
    days_remaining = last_day - now.day

    if days_remaining < 5:
        # Bônus: adiciona os dias do plano a partir do fim do mês atual
        end_of_month = datetime(now.year, now.month, last_day, 23, 59, 59, tzinfo=timezone.utc)
        return end_of_month + timedelta(days=plan['days'])
    else:
        return now + timedelta(days=plan['days'])

def calc_plan_amount(base_price, plan_type):
    """Calcula valor total do plano."""
    plan = PLAN_CONFIG.get(plan_type, PLAN_CONFIG['monthly'])
    return round(base_price * plan['multiplier'], 2)

def generate_temp_password():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=10))

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Token não fornecido')
    token = auth.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expirado')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Token inválido')
    user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='Usuário não encontrado')
    return user

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Acesso negado')
    return user

# ============ INIT DEFAULT ADMIN ============

@app.on_event("startup")
async def startup():
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@vocallayers.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    existing = await db.users.find_one({'email': admin_email}, {'_id': 0})
    if not existing:
        admin = {
            'id': str(uuid.uuid4()),
            'name': 'Administrador',
            'email': admin_email,
            'password_hash': hash_password(admin_password),
            'role': 'admin',
            'is_active': True,
            'whatsapp': '',
            'plan_type': None,
            'activation_date': datetime.now(timezone.utc).isoformat(),
            'subscription_expires': None,
            'price_locked': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin)
        logger.info(f"Admin padrão criado: {admin_email}")

    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    if not pricing:
        await db.pricing_config.insert_one({
            'id': str(uuid.uuid4()),
            'current_price': 29.90,
            'apply_to_all': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        })

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({'email': data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail='Email já cadastrado')
    if data.plan_type not in PLAN_CONFIG:
        raise HTTPException(status_code=400, detail='Plano inválido')
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    base_price = pricing['current_price'] if pricing else 29.90
    user = {
        'id': str(uuid.uuid4()),
        'name': data.name,
        'email': data.email,
        'password_hash': hash_password(data.password),
        'role': 'user',
        'is_active': True,
        'whatsapp': '',
        'plan_type': data.plan_type,
        'activation_date': datetime.now(timezone.utc).isoformat(),
        'subscription_expires': calc_subscription_expiry(data.plan_type).isoformat(),
        'price_locked': base_price,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user['id'], 'user')
    return {
        'token': token,
        'user': {k: v for k, v in user.items() if k not in ('password_hash', '_id')}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    if not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Conta desativada pelo administrador')
    if user.get('role') != 'admin':
        expires = user.get('subscription_expires')
        if expires:
            exp_dt = datetime.fromisoformat(expires)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail='Assinatura expirada. Renove seu plano.')
    token = create_token(user['id'], user['role'])
    return {
        'token': token,
        'user': {k: v for k, v in user.items() if k not in ('password_hash', '_id')}
    }

@api_router.post("/auth/admin/login")
async def admin_login(data: UserLogin):
    user = await db.users.find_one({'email': data.email, 'role': 'admin'}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='Credenciais de admin inválidas')
    if not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    token = create_token(user['id'], 'admin')
    return {
        'token': token,
        'user': {k: v for k, v in user.items() if k not in ('password_hash', '_id')}
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user:
        return {'message': 'Se o email existir, uma nova senha será enviada.'}
    new_password = generate_temp_password()
    hashed = hash_password(new_password)
    await db.users.update_one({'email': data.email}, {'$set': {'password_hash': hashed}})
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [data.email],
            "subject": "Vocal Layers - Recuperação de Senha",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FFD700;">Vocal Layers</h2>
                <p>Sua nova senha temporária é:</p>
                <div style="background: #1a1a2e; color: #FFD700; padding: 15px; border-radius: 8px; font-size: 20px; text-align: center; font-family: monospace;">
                    {new_password}
                </div>
                <p style="color: #888; margin-top: 15px;">Recomendamos que altere sua senha após fazer login.</p>
            </div>
            """
        }
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logger.error(f"Erro ao enviar email: {e}")
    return {'message': 'Se o email existir, uma nova senha será enviada.'}

# ============ USER ROUTES ============

@api_router.get("/users/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k not in ('password_hash', '_id')}

@api_router.put("/users/me")
async def update_me(data: UserUpdate, user: dict = Depends(get_current_user)):
    update_fields = {}
    if data.name is not None:
        update_fields['name'] = data.name
    if data.whatsapp is not None:
        update_fields['whatsapp'] = data.whatsapp
    if update_fields:
        await db.users.update_one({'id': user['id']}, {'$set': update_fields})
    updated = await db.users.find_one({'id': user['id']}, {'_id': 0, 'password_hash': 0})
    return updated

@api_router.put("/users/me/password")
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user)):
    if not verify_password(data.current_password, user['password_hash']):
        raise HTTPException(status_code=400, detail='Senha atual incorreta')
    hashed = hash_password(data.new_password)
    await db.users.update_one({'id': user['id']}, {'$set': {'password_hash': hashed}})
    return {'message': 'Senha alterada com sucesso'}

# ============ PLAN INFO ============

@api_router.get("/plans")
async def get_plans():
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    base_price = pricing['current_price'] if pricing else 29.90
    plans = []
    for key, cfg in PLAN_CONFIG.items():
        total = round(base_price * cfg['multiplier'], 2)
        plans.append({
            'id': key,
            'label': cfg['label'],
            'days': cfg['days'],
            'base_price': base_price,
            'total_price': total,
        })
    return plans

# ============ SONGS ROUTES ============

@api_router.get("/songs")
async def get_songs(user: dict = Depends(get_current_user)):
    songs = await db.songs.find({}, {'_id': 0}).sort('title', 1).to_list(1000)
    return songs

@api_router.get("/songs/{song_id}")
async def get_song(song_id: str, user: dict = Depends(get_current_user)):
    song = await db.songs.find_one({'id': song_id}, {'_id': 0})
    if not song:
        raise HTTPException(status_code=404, detail='Música não encontrada')
    return song

# ============ AUDIO STREAMING ============

@api_router.get("/audio/stream/{song_id}/{track_index}")
async def stream_audio(song_id: str, track_index: int, request: Request, user: dict = Depends(get_current_user)):
    song = await db.songs.find_one({'id': song_id}, {'_id': 0})
    if not song:
        raise HTTPException(status_code=404, detail='Música não encontrada')
    tracks = song.get('tracks', [])
    if track_index < 0 or track_index >= len(tracks):
        raise HTTPException(status_code=404, detail='Faixa não encontrada')
    track = tracks[track_index]
    file_path = Path(track['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail='Arquivo não encontrado')
    file_size = file_path.stat().st_size
    content_type = 'audio/mpeg' if str(file_path).endswith('.mp3') else 'audio/wav'

    range_header = request.headers.get('range')
    if range_header:
        range_start, range_end = 0, file_size - 1
        range_spec = range_header.replace('bytes=', '')
        if '-' in range_spec:
            parts = range_spec.split('-')
            range_start = int(parts[0]) if parts[0] else 0
            range_end = int(parts[1]) if parts[1] else file_size - 1
        chunk_size = range_end - range_start + 1

        async def range_generator():
            async with aiofiles.open(file_path, 'rb') as f:
                await f.seek(range_start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(8192, remaining)
                    data = await f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            range_generator(), status_code=206, media_type=content_type,
            headers={
                'Content-Range': f'bytes {range_start}-{range_end}/{file_size}',
                'Accept-Ranges': 'bytes', 'Content-Length': str(chunk_size),
                'Content-Disposition': 'inline',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            }
        )

    async def file_generator():
        async with aiofiles.open(file_path, 'rb') as f:
            while True:
                data = await f.read(8192)
                if not data:
                    break
                yield data

    return StreamingResponse(
        file_generator(), media_type=content_type,
        headers={
            'Content-Length': str(file_size), 'Accept-Ranges': 'bytes',
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
        }
    )

# ============ WARMUP ROUTES ============

@api_router.get("/warmup")
async def get_warmup(user: dict = Depends(get_current_user)):
    items = await db.warmup_content.find({}, {'_id': 0}).to_list(100)
    return items

@api_router.get("/warmup/{item_id}")
async def get_warmup_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.warmup_content.find_one({'id': item_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail='Conteúdo não encontrado')
    return item

@api_router.get("/warmup/stream/{item_id}")
async def stream_warmup(item_id: str, request: Request, user: dict = Depends(get_current_user)):
    item = await db.warmup_content.find_one({'id': item_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail='Conteúdo não encontrado')
    file_path = Path(item.get('file_path', ''))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail='Arquivo não encontrado')
    file_size = file_path.stat().st_size
    ext = file_path.suffix.lower()
    content_types = {'.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm'}
    content_type = content_types.get(ext, 'application/octet-stream')

    async def file_generator():
        async with aiofiles.open(file_path, 'rb') as f:
            while True:
                data = await f.read(8192)
                if not data:
                    break
                yield data

    return StreamingResponse(
        file_generator(), media_type=content_type,
        headers={'Content-Length': str(file_size), 'Content-Disposition': 'inline', 'Cache-Control': 'no-store, no-cache'}
    )

# ============ PAYMENT ROUTES ============

@api_router.post("/payments/create-session")
async def create_payment_session(data: PaymentCreateRequest, request: Request, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    user_price = user.get('price_locked')
    plan_type = user.get('plan_type', 'monthly')

    if pricing and pricing.get('apply_to_all'):
        base = pricing['current_price']
    elif user_price is not None:
        base = user_price
    elif pricing:
        base = pricing['current_price']
    else:
        base = 29.90

    amount = calc_plan_amount(base, plan_type)

    host_url = data.origin_url.rstrip('/')
    success_url = f"{host_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment"

    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    checkout_request = CheckoutSessionRequest(
        amount=float(amount), currency="brl",
        success_url=success_url, cancel_url=cancel_url,
        metadata={'user_id': user['id'], 'user_email': user['email'], 'plan_type': plan_type}
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)

    await db.payment_transactions.insert_one({
        'id': str(uuid.uuid4()), 'user_id': user['id'], 'user_email': user['email'],
        'session_id': session.session_id, 'amount': float(amount), 'currency': 'brl',
        'plan_type': plan_type, 'status': 'initiated', 'payment_status': 'pending',
        'metadata': {'plan_type': plan_type},
        'created_at': datetime.now(timezone.utc).isoformat()
    })

    return {'url': session.url, 'session_id': session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    tx = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})

    if status.payment_status == 'paid' and tx and tx.get('payment_status') != 'paid':
        await db.payment_transactions.update_one(
            {'session_id': session_id},
            {'$set': {'status': 'complete', 'payment_status': 'paid', 'paid_at': datetime.now(timezone.utc).isoformat()}}
        )
        plan_type = tx.get('plan_type', user.get('plan_type', 'monthly'))
        new_expiry = calc_subscription_expiry(plan_type).isoformat()
        await db.users.update_one(
            {'id': user['id']},
            {'$set': {'subscription_expires': new_expiry, 'is_active': True}}
        )
    elif status.status == 'expired' and tx and tx.get('status') != 'expired':
        await db.payment_transactions.update_one(
            {'session_id': session_id},
            {'$set': {'status': 'expired', 'payment_status': 'expired'}}
        )

    return {
        'status': status.status, 'payment_status': status.payment_status,
        'amount_total': status.amount_total, 'currency': status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    body = await request.body()
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, request.headers.get("Stripe-Signature"))
        if webhook_response.payment_status == 'paid':
            session_id = webhook_response.session_id
            tx = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})
            if tx and tx.get('payment_status') != 'paid':
                await db.payment_transactions.update_one(
                    {'session_id': session_id},
                    {'$set': {'status': 'complete', 'payment_status': 'paid', 'paid_at': datetime.now(timezone.utc).isoformat()}}
                )
                user_id = tx.get('user_id') or (webhook_response.metadata or {}).get('user_id')
                plan_type = tx.get('plan_type', 'monthly')
                if user_id:
                    new_expiry = calc_subscription_expiry(plan_type).isoformat()
                    await db.users.update_one(
                        {'id': user_id},
                        {'$set': {'subscription_expires': new_expiry, 'is_active': True}}
                    )
        return {'status': 'ok'}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {'status': 'error'}

# ============ PRICING ROUTES ============

@api_router.get("/pricing")
async def get_pricing(user: dict = Depends(get_current_user)):
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    return pricing or {'current_price': 29.90, 'apply_to_all': False}

@api_router.get("/pricing/public")
async def get_public_pricing():
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    return {'price': pricing['current_price'] if pricing else 29.90}

# ============ ADMIN ROUTES ============

@api_router.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(get_admin_user)):
    total_songs = await db.songs.count_documents({})
    total_users = await db.users.count_documents({'role': 'user'})
    active_users = await db.users.count_documents({'role': 'user', 'is_active': True})
    inactive_users = total_users - active_users
    inactive_list = await db.users.find(
        {'role': 'user', 'is_active': False},
        {'_id': 0, 'email': 1, 'name': 1, 'id': 1}
    ).to_list(1000)
    total_warmup = await db.warmup_content.count_documents({})

    # Métricas por plano
    now = datetime.now(timezone.utc).isoformat()
    plan_metrics = {}
    for plan_key in PLAN_CONFIG:
        total = await db.users.count_documents({'role': 'user', 'plan_type': plan_key})
        active = await db.users.count_documents({'role': 'user', 'plan_type': plan_key, 'is_active': True, 'subscription_expires': {'$gte': now}})
        expired = total - active
        plan_metrics[plan_key] = {'total': total, 'active': active, 'expired': expired, 'label': PLAN_CONFIG[plan_key]['label']}

    # Usuários prestes a expirar (próximos 7 dias)
    soon = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    expiring_soon = await db.users.find(
        {'role': 'user', 'is_active': True, 'subscription_expires': {'$gte': now, '$lte': soon}},
        {'_id': 0, 'id': 1, 'name': 1, 'email': 1, 'subscription_expires': 1, 'plan_type': 1, 'price_locked': 1}
    ).to_list(1000)

    # Receita: soma dos pagamentos confirmados
    paid_txs = await db.payment_transactions.find({'payment_status': 'paid'}, {'_id': 0, 'amount': 1, 'plan_type': 1, 'created_at': 1}).to_list(5000)
    total_revenue = sum(tx.get('amount', 0) for tx in paid_txs)
    revenue_by_plan = {}
    for tx in paid_txs:
        pt = tx.get('plan_type', 'monthly')
        revenue_by_plan[pt] = revenue_by_plan.get(pt, 0) + tx.get('amount', 0)

    # Total pagamentos
    total_payments = await db.payment_transactions.count_documents({'payment_status': 'paid'})

    return {
        'total_songs': total_songs, 'total_users': total_users,
        'active_users': active_users, 'inactive_users': inactive_users,
        'inactive_user_list': inactive_list, 'total_warmup': total_warmup,
        'plan_metrics': plan_metrics,
        'expiring_soon': expiring_soon,
        'total_revenue': round(total_revenue, 2),
        'revenue_by_plan': {k: round(v, 2) for k, v in revenue_by_plan.items()},
        'total_payments': total_payments,
    }

@api_router.post("/admin/notify-expiring")
async def admin_notify_expiring(admin: dict = Depends(get_admin_user)):
    """Envia notificação por email para usuários com assinatura expirando em até 5 dias."""
    now = datetime.now(timezone.utc).isoformat()
    soon = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    expiring = await db.users.find(
        {'role': 'user', 'is_active': True, 'subscription_expires': {'$gte': now, '$lte': soon}},
        {'_id': 0, 'id': 1, 'name': 1, 'email': 1, 'subscription_expires': 1, 'plan_type': 1, 'price_locked': 1}
    ).to_list(1000)

    sent = 0
    errors = 0
    for user in expiring:
        exp_date = user.get('subscription_expires', '')
        try:
            exp_formatted = datetime.fromisoformat(exp_date).strftime('%d/%m/%Y') if exp_date else '-'
        except Exception:
            exp_formatted = exp_date[:10] if exp_date else '-'

        price = user.get('price_locked', 29.90)
        plan_label = PLAN_CONFIG.get(user.get('plan_type', 'monthly'), {}).get('label', 'Mensal')

        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [user['email']],
                "subject": "Vocal Layers - Sua assinatura está expirando!",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #FFD700;">Vocal Layers</h2>
                    <p>Olá <strong>{user['name']}</strong>,</p>
                    <p>Sua assinatura do plano <strong>{plan_label}</strong> expira em <strong>{exp_formatted}</strong>.</p>
                    <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="color: #FFD700; margin: 0; font-size: 16px;">Renove agora por R$ {price:.2f}</p>
                    </div>
                    <p>Acesse a plataforma e vá em <strong>Perfil → Assinatura</strong> para renovar.</p>
                    <p style="color: #888; font-size: 12px; margin-top: 20px;">Não perca acesso às suas faixas vocais!</p>
                </div>
                """
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent += 1
        except Exception as e:
            logger.error(f"Erro ao notificar {user['email']}: {e}")
            errors += 1

    return {'message': f'{sent} notificações enviadas, {errors} erros', 'total_expiring': len(expiring), 'sent': sent, 'errors': errors}

# ---- Admin Users ----

@api_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).sort('name', 1).to_list(1000)
    return users

@api_router.post("/admin/users")
async def admin_create_user(data: AdminUserCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.users.find_one({'email': data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail='Email já cadastrado')
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    base_price = data.price_locked if data.price_locked is not None else (pricing['current_price'] if pricing else 29.90)
    plan = data.plan_type if data.plan_type in PLAN_CONFIG else 'monthly'
    user = {
        'id': str(uuid.uuid4()),
        'name': data.name,
        'email': data.email,
        'password_hash': hash_password(data.password),
        'role': data.role,
        'is_active': True,
        'whatsapp': '',
        'plan_type': plan if data.role == 'user' else None,
        'activation_date': datetime.now(timezone.utc).isoformat(),
        'subscription_expires': calc_subscription_expiry(plan).isoformat() if data.role == 'user' else None,
        'price_locked': base_price if data.role == 'user' else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return {k: v for k, v in user.items() if k not in ('password_hash', '_id')}

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: AdminUserUpdate, admin: dict = Depends(get_admin_user)):
    update_fields = {}
    if data.name is not None:
        update_fields['name'] = data.name
    if data.email is not None:
        update_fields['email'] = data.email
    if data.is_active is not None:
        update_fields['is_active'] = data.is_active
    if data.activation_date is not None:
        update_fields['activation_date'] = data.activation_date
    if data.subscription_expires is not None:
        update_fields['subscription_expires'] = data.subscription_expires
    if data.price_locked is not None:
        update_fields['price_locked'] = data.price_locked
    if data.plan_type is not None:
        update_fields['plan_type'] = data.plan_type
    if update_fields:
        await db.users.update_one({'id': user_id}, {'$set': update_fields})
    updated = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    if not updated:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    return updated

@api_router.post("/admin/users/{user_id}/activate")
async def admin_activate_user(user_id: str, data: AdminActivateUser, admin: dict = Depends(get_admin_user)):
    """Ativa um usuário com data de expiração específica."""
    await db.users.update_one(
        {'id': user_id},
        {'$set': {'is_active': True, 'subscription_expires': data.subscription_expires}}
    )
    updated = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    if not updated:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    return updated

@api_router.put("/admin/users/{user_id}/password")
async def admin_reset_password(user_id: str, data: AdminPasswordReset, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')

    if data.send_email:
        new_pw = generate_temp_password()
    elif data.new_password:
        new_pw = data.new_password
    else:
        raise HTTPException(status_code=400, detail='Informe uma senha ou marque envio por email')

    hashed = hash_password(new_pw)
    await db.users.update_one({'id': user_id}, {'$set': {'password_hash': hashed}})

    if data.send_email:
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [user['email']],
                "subject": "Vocal Layers - Nova Senha",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #FFD700;">Vocal Layers</h2>
                    <p>Olá {user['name']}, sua nova senha é:</p>
                    <div style="background: #1a1a2e; color: #FFD700; padding: 15px; border-radius: 8px; font-size: 20px; text-align: center; font-family: monospace;">
                        {new_pw}
                    </div>
                    <p style="color: #888; margin-top: 15px;">Recomendamos que altere sua senha após fazer login.</p>
                </div>
                """
            }
            await asyncio.to_thread(resend.Emails.send, params)
            return {'message': f'Senha temporária enviada para {user["email"]}'}
        except Exception as e:
            logger.error(f"Erro email: {e}")
            return {'message': f'Senha alterada, mas falha ao enviar email. Senha: {new_pw}'}

    return {'message': 'Senha alterada com sucesso'}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    return {'message': 'Usuário removido'}

@api_router.post("/admin/users/batch-pricing")
async def admin_batch_pricing(data: AdminBatchPricing, admin: dict = Depends(get_admin_user)):
    """Atualiza preço em lote. Se only_increase=True, só sobe para quem tem valor menor."""
    if data.only_increase:
        result = await db.users.update_many(
            {'role': 'user', 'price_locked': {'$lt': data.new_price}},
            {'$set': {'price_locked': data.new_price}}
        )
    else:
        result = await db.users.update_many(
            {'role': 'user'},
            {'$set': {'price_locked': data.new_price}}
        )
    # Also update the global pricing config
    await db.pricing_config.update_one(
        {},
        {'$set': {'current_price': data.new_price, 'updated_at': datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {'message': f'{result.modified_count} usuários atualizados para R$ {data.new_price:.2f}'}

# ---- Admin Songs ----

@api_router.get("/admin/songs")
async def admin_get_songs(admin: dict = Depends(get_admin_user)):
    songs = await db.songs.find({}, {'_id': 0}).sort('title', 1).to_list(1000)
    return songs

@api_router.post("/admin/songs")
async def admin_create_song(title: str = Form(...), artist: str = Form(""), admin: dict = Depends(get_admin_user)):
    song = {
        'id': str(uuid.uuid4()), 'title': title, 'artist': artist,
        'tracks': [], 'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.songs.insert_one(song)
    return {k: v for k, v in song.items() if k != '_id'}

@api_router.put("/admin/songs/{song_id}")
async def admin_update_song(song_id: str, title: str = Form(...), artist: str = Form(""), admin: dict = Depends(get_admin_user)):
    result = await db.songs.update_one({'id': song_id}, {'$set': {'title': title, 'artist': artist}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Música não encontrada')
    updated = await db.songs.find_one({'id': song_id}, {'_id': 0})
    return updated

@api_router.delete("/admin/songs/{song_id}")
async def admin_delete_song(song_id: str, admin: dict = Depends(get_admin_user)):
    song = await db.songs.find_one({'id': song_id}, {'_id': 0})
    if not song:
        raise HTTPException(status_code=404, detail='Música não encontrada')
    for track in song.get('tracks', []):
        fp = Path(track.get('file_path', ''))
        if fp.exists():
            fp.unlink()
    await db.songs.delete_one({'id': song_id})
    return {'message': 'Música removida'}

@api_router.post("/admin/songs/{song_id}/tracks")
async def admin_add_track(
    song_id: str, track_name: str = Form(...), track_type: str = Form(...),
    file: UploadFile = File(...), admin: dict = Depends(get_admin_user)
):
    song = await db.songs.find_one({'id': song_id}, {'_id': 0})
    if not song:
        raise HTTPException(status_code=404, detail='Música não encontrada')
    ext = Path(file.filename).suffix.lower()
    if ext not in ('.mp3', '.wav'):
        raise HTTPException(status_code=400, detail='Use MP3 ou WAV.')
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{ext}"
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    track = {
        'name': track_name, 'type': track_type, 'file_path': str(file_path),
        'file_ext': ext, 'uploaded_at': datetime.now(timezone.utc).isoformat()
    }
    await db.songs.update_one({'id': song_id}, {'$push': {'tracks': track}})
    updated = await db.songs.find_one({'id': song_id}, {'_id': 0})
    return updated

@api_router.delete("/admin/songs/{song_id}/tracks/{track_index}")
async def admin_delete_track(song_id: str, track_index: int, admin: dict = Depends(get_admin_user)):
    song = await db.songs.find_one({'id': song_id}, {'_id': 0})
    if not song:
        raise HTTPException(status_code=404, detail='Música não encontrada')
    tracks = song.get('tracks', [])
    if track_index < 0 or track_index >= len(tracks):
        raise HTTPException(status_code=404, detail='Faixa não encontrada')
    track = tracks[track_index]
    fp = Path(track.get('file_path', ''))
    if fp.exists():
        fp.unlink()
    tracks.pop(track_index)
    await db.songs.update_one({'id': song_id}, {'$set': {'tracks': tracks}})
    updated = await db.songs.find_one({'id': song_id}, {'_id': 0})
    return updated

# ---- Admin Warmup ----

@api_router.get("/admin/warmup")
async def admin_get_warmup(admin: dict = Depends(get_admin_user)):
    items = await db.warmup_content.find({}, {'_id': 0}).to_list(100)
    return items

@api_router.post("/admin/warmup")
async def admin_create_warmup(
    title: str = Form(...), description: str = Form(""), content_type: str = Form("audio"),
    file: UploadFile = File(...), admin: dict = Depends(get_admin_user)
):
    ext = Path(file.filename).suffix.lower()
    allowed = ('.mp3', '.wav', '.mp4', '.webm')
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f'Use: {", ".join(allowed)}')
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"warmup_{file_id}{ext}"
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    item = {
        'id': str(uuid.uuid4()), 'title': title, 'description': description,
        'content_type': content_type, 'file_path': str(file_path), 'file_ext': ext,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.warmup_content.insert_one(item)
    return {k: v for k, v in item.items() if k != '_id'}

@api_router.delete("/admin/warmup/{item_id}")
async def admin_delete_warmup(item_id: str, admin: dict = Depends(get_admin_user)):
    item = await db.warmup_content.find_one({'id': item_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail='Conteúdo não encontrado')
    fp = Path(item.get('file_path', ''))
    if fp.exists():
        fp.unlink()
    await db.warmup_content.delete_one({'id': item_id})
    return {'message': 'Conteúdo removido'}

# ---- Admin Pricing ----

@api_router.get("/admin/pricing")
async def admin_get_pricing(admin: dict = Depends(get_admin_user)):
    pricing = await db.pricing_config.find_one({}, {'_id': 0})
    return pricing or {'current_price': 29.90, 'apply_to_all': False}

@api_router.put("/admin/pricing")
async def admin_update_pricing(data: PricingUpdate, admin: dict = Depends(get_admin_user)):
    await db.pricing_config.update_one(
        {},
        {'$set': {'current_price': data.price, 'apply_to_all': data.apply_to_all, 'updated_at': datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    if data.apply_to_all:
        await db.users.update_many({'role': 'user'}, {'$set': {'price_locked': data.price}})
    return {'message': 'Preço atualizado', 'current_price': data.price, 'apply_to_all': data.apply_to_all}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
