from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import timedelta
import qrcode
import io
import base64

from .config import settings
from .database import get_db, engine
from . import crud, models, schemas, auth
from .notifications import notify_user, send_telegram_notification
from .tron_service import tron_service

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TRON Staking API",
    description="API for TRON USDT staking platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for WebApp
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")


# User endpoints
@app.post("/api/auth/telegram", response_model=schemas.User)
async def telegram_auth(telegram_data: dict, db: Session = Depends(get_db)):
    """Authenticate user via Telegram WebApp data"""
    if not auth.verify_telegram_data(telegram_data):
        raise HTTPException(status_code=400, detail="Invalid Telegram data")
    
    telegram_id = str(telegram_data.get("id"))
    user = crud.get_user_by_telegram_id(db, telegram_id)
    
    if not user:
        user_data = schemas.UserCreate(
            telegram_id=telegram_id,
            username=telegram_data.get("username"),
            first_name=telegram_data.get("first_name"),
            last_name=telegram_data.get("last_name"),
            language_code=telegram_data.get("language_code", "en")
        )
        user = crud.create_user(db, user_data)
    
    return user


@app.get("/api/user/{telegram_id}/balance", response_model=schemas.UserBalance)
async def get_user_balance(telegram_id: str, db: Session = Depends(get_db)):
    """Get user balance"""
    user = crud.get_user_by_telegram_id(db, telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return crud.get_user_balance(db, user.id)


@app.get("/api/user/{telegram_id}/dashboard", response_model=schemas.Dashboard)
async def get_user_dashboard(telegram_id: str, db: Session = Depends(get_db)):
    """Get user dashboard data"""
    user = crud.get_user_by_telegram_id(db, telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    balance = crud.get_user_balance(db, user.id)
    recent_deposits = crud.get_user_deposits(db, user.id, limit=5)
    recent_accruals = crud.get_user_accruals(db, user.id, limit=5)
    recent_withdrawals = crud.get_user_withdrawals(db, user.id, limit=5)
    
    return schemas.Dashboard(
        balance=balance,
        recent_transactions=recent_deposits,
        recent_accruals=recent_accruals,
        recent_withdrawals=recent_withdrawals
    )


@app.post("/api/user/{telegram_id}/deposit", response_model=schemas.Deposit)
async def create_deposit(
    telegram_id: str,
    deposit: schemas.DepositCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create new deposit request"""
    user = crud.get_user_by_telegram_id(db, telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if tx_hash already exists
    existing_deposit = crud.get_deposit_by_tx_hash(db, deposit.tx_hash)
    if existing_deposit:
        raise HTTPException(status_code=400, detail="Transaction hash already exists")
    
    # Create deposit
    db_deposit = crud.create_deposit(db, deposit, user.id)
    # Notify user
    notify_user(user.telegram_id, "Your deposit request has been created. Please wait for at least 19 confirmations.")

    # Background task to verify transaction
    background_tasks.add_task(verify_deposit_transaction, db_deposit.id)
    
    return db_deposit


@app.post("/api/user/{telegram_id}/withdraw", response_model=schemas.Withdrawal)
async def create_withdrawal(
    telegram_id: str,
    withdrawal: schemas.WithdrawalCreate,
    db: Session = Depends(get_db)
):
    """Create withdrawal request"""
    user = crud.get_user_by_telegram_id(db, telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate address
    if not await tron_service.validate_address(withdrawal.to_address):
        raise HTTPException(status_code=400, detail="Invalid TRON address")
    
    # Check balance
    balance = crud.get_user_balance(db, user.id)
    if withdrawal.amount > balance.total_balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create withdrawal
    db_withdrawal = crud.create_withdrawal(db, withdrawal, user.id)
    notify_user(user.telegram_id, "Your withdrawal request has been created.")

    return db_withdrawal


@app.get("/api/user/{telegram_id}/deposits", response_model=List[schemas.Deposit])
async def get_user_deposits(telegram_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get user deposits"""
    user = crud.get_user_by_telegram_id(db, telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return crud.get_user_deposits(db, user.id, skip, limit)


@app.get("/api/user/{telegram_id}/withdrawals", response_model=List[schemas.Withdrawal])
async def get_user_withdrawals(telegram_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get user withdrawals"""
    user = crud.get_user_by_telegram_id(db, telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return crud.get_user_withdrawals(db, user.id, skip, limit)


@app.get("/api/deposit-info")
async def get_deposit_info():
    """Get deposit information"""
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(settings.deposit_address)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "address": settings.deposit_address,
        "network": "TRC-20",
        "token": "USDT",
        "qr_code": f"data:image/png;base64,{qr_code}",
        "min_confirmations": 19
    }


# Admin endpoints
@app.post("/api/admin/login", response_model=schemas.AdminToken)
async def admin_login(login_data: schemas.AdminLogin, db: Session = Depends(get_db)):
    """Admin login"""
    admin = auth.authenticate_admin(db, login_data.username, login_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth.create_access_token(
        data={"sub": admin.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/admin/deposits", response_model=List[schemas.Deposit])
async def get_all_deposits(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all deposits with optional status filter"""
    query = db.query(models.Deposit)
    
    if status and status != "all":
        query = query.filter(models.Deposit.status == status)
    
    deposits = query.offset(skip).limit(limit).all()
    return deposits


# Place pending deposits route BEFORE the parameterized route to avoid conflicts
@app.get("/api/admin/deposits/pending", response_model=List[schemas.Deposit])
async def get_pending_deposits(
    skip: int = 0,
    limit: int = 100,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get pending deposits"""
    return crud.get_pending_deposits(db, skip, limit)


@app.get("/api/admin/deposits/{deposit_id}", response_model=schemas.Deposit)
async def get_deposit_details(
    deposit_id: int,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get deposit details"""
    deposit = crud.get_deposit(db, deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return deposit


@app.get("/api/admin/withdrawals", response_model=List[schemas.Withdrawal])
async def get_all_withdrawals(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all withdrawals with optional status filter"""
    query = db.query(models.Withdrawal)
    
    if status and status != "all":
        query = query.filter(models.Withdrawal.status == status)
    
    withdrawals = query.offset(skip).limit(limit).all()
    return withdrawals


@app.patch("/api/admin/deposits/{deposit_id}/amount", response_model=schemas.Deposit)
async def set_deposit_amount(
    deposit_id: int,
    payload: dict,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Update only the amount field for a deposit."""
    amount = payload.get("amount")
    if amount is None:
        raise HTTPException(status_code=400, detail="amount is required")
    update = schemas.DepositUpdate(amount=amount)
    deposit = crud.update_deposit(db, deposit_id, update)
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return deposit


# Place pending withdrawals route BEFORE the parameterized route to avoid conflicts
@app.get("/api/admin/withdrawals/pending", response_model=List[schemas.Withdrawal])
async def get_pending_withdrawals(
    skip: int = 0,
    limit: int = 100,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get pending withdrawals"""
    return crud.get_pending_withdrawals(db, skip, limit)


@app.get("/api/admin/withdrawals/{withdrawal_id}", response_model=schemas.Withdrawal)
async def get_withdrawal_details(
    withdrawal_id: int,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get withdrawal details"""
    withdrawal = crud.get_withdrawal(db, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return withdrawal


@app.get("/api/admin/accruals", response_model=List[schemas.Accrual])
async def get_recent_accruals(
    skip: int = 0,
    limit: int = 100,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get recent accruals"""
    accruals = db.query(models.Accrual).order_by(models.Accrual.created_at.desc()).offset(skip).limit(limit).all()
    return accruals


@app.post("/api/admin/accruals/bulk")
async def create_bulk_accrual(
    bulk_data: dict,
    background_tasks: BackgroundTasks,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Create bulk accrual for all active users based on percentage of their balance"""
    percentage = bulk_data.get("percentage")
    description = bulk_data.get("description")
    
    if not percentage or percentage <= 0 or percentage > 100:
        raise HTTPException(status_code=400, detail="Invalid percentage (must be between 0 and 100)")
    
    # Get all active users
    active_users = db.query(models.User).filter(models.User.is_active == True).all()
    
    created_accruals = []
    for user in active_users:
        # Get user's current balance
        user_balance = crud.get_user_balance(db, user.id)
        if user_balance.total_balance <= 0:
            continue  # Skip users with zero balance
            
        # Calculate accrual amount as percentage of balance
        accrual_amount = (user_balance.total_balance * percentage) / 100
        
        accrual_data = schemas.AccrualCreate(
            user_id=user.id,
            amount=accrual_amount,
            description=description,
            admin_comment=f"Bulk accrual {percentage}% by {admin.username}"
        )
        accrual = crud.create_accrual(db, accrual_data)
        created_accruals.append(accrual)
        # Notify each user about earnings
        background_tasks.add_task(send_telegram_notification, user.telegram_id, "accrual_created", {"amount": accrual_amount})
    
    return {"message": f"Created {len(created_accruals)} accruals", "count": len(created_accruals)}


@app.get("/api/admin/users/{user_id}/balance", response_model=schemas.UserBalance)
async def get_user_balance_admin(
    user_id: int,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get user balance for admin"""
    return crud.get_user_balance(db, user_id)


@app.get("/api/admin/users", response_model=List[schemas.User])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all users with optional search"""
    query = db.query(models.User)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.User.username.ilike(search_pattern),
                models.User.first_name.ilike(search_pattern),
                models.User.last_name.ilike(search_pattern),
                models.User.telegram_id.ilike(search_pattern)
            )
        )
    
    users = query.offset(skip).limit(limit).all()
    return users


@app.get("/api/admin/users/{user_id}", response_model=schemas.User)
async def get_user_details(
    user_id: int,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get user details"""
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/admin/users/{user_id}/balance", response_model=schemas.UserBalance)
async def get_user_balance_admin(
    user_id: int,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get user balance (admin view)"""
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return crud.get_user_balance(db, user_id)


@app.get("/api/admin/stats", response_model=schemas.AdminStats)
async def get_admin_stats(admin: models.AdminUser = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Get admin statistics"""
    return crud.get_admin_stats(db)


@app.get("/api/admin/deposits/pending", response_model=List[schemas.Deposit])
async def get_pending_deposits(
    skip: int = 0,
    limit: int = 100,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get pending deposits"""
    return crud.get_pending_deposits(db, skip, limit)


@app.put("/api/admin/deposits/{deposit_id}", response_model=schemas.Deposit)
async def update_deposit(
    deposit_id: int,
    deposit_update: schemas.DepositUpdate,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Update deposit status"""
    deposit = crud.update_deposit(db, deposit_id, deposit_update)
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    # Send notification on status change
    if deposit_update.status in [models.TransactionStatus.APPROVED, models.TransactionStatus.REJECTED]:
        user = crud.get_user(db, deposit.user_id)
        if user:
            if deposit_update.status == models.TransactionStatus.APPROVED:
                notify_user(user.telegram_id, "Your deposit has been credited to your account.")
            else:
                notify_user(user.telegram_id, "Your deposit request was rejected.")

    return deposit


@app.get("/api/admin/withdrawals/pending", response_model=List[schemas.Withdrawal])
async def get_pending_withdrawals(
    skip: int = 0,
    limit: int = 100,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get pending withdrawals"""
    return crud.get_pending_withdrawals(db, skip, limit)


@app.put("/api/admin/withdrawals/{withdrawal_id}", response_model=schemas.Withdrawal)
async def update_withdrawal(
    withdrawal_id: int,
    withdrawal_update: schemas.WithdrawalUpdate,
    background_tasks: BackgroundTasks,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Update withdrawal status"""
    withdrawal = crud.update_withdrawal(db, withdrawal_id, withdrawal_update)
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    user = crud.get_user(db, withdrawal.user_id)
    if user:
        if withdrawal_update.status == models.WithdrawalStatus.APPROVED:
            background_tasks.add_task(send_telegram_notification, user.telegram_id, "withdrawal_approved", {"amount": withdrawal.amount})
        elif withdrawal_update.status == models.WithdrawalStatus.REJECTED:
            background_tasks.add_task(send_telegram_notification, user.telegram_id, "withdrawal_rejected", {"amount": withdrawal.amount})
        elif withdrawal_update.status == models.WithdrawalStatus.COMPLETED:
            background_tasks.add_task(send_telegram_notification, user.telegram_id, "withdrawal_completed", {"amount": withdrawal.amount, "tx_hash": withdrawal.tx_hash or "N/A"})

    return withdrawal


@app.post("/api/admin/accruals", response_model=schemas.Accrual)
async def create_accrual(
    accrual: schemas.AccrualCreate,
    background_tasks: BackgroundTasks,
    admin: models.AdminUser = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Create accrual for user"""
    created = crud.create_accrual(db, accrual)
    # Notify earnings to specified user
    user = crud.get_user(db, created.user_id)
    if user:
        background_tasks.add_task(send_telegram_notification, user.telegram_id, "accrual_created", {"amount": created.amount})
    return created


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "tron-staking-api"}


# WebApp routes
@app.get("/", response_class=HTMLResponse)
async def webapp_index():
    """Serve WebApp"""
    with open("frontend/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/admin", response_class=HTMLResponse)
async def admin_panel():
    """Serve Admin Panel"""
    with open("frontend/admin.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


# Background tasks
async def verify_deposit_transaction(deposit_id: int):
    """Background task to verify deposit transaction"""
    from .database import SessionLocal
    
    db = SessionLocal()
    try:
        deposit = crud.get_deposit(db, deposit_id)
        if not deposit:
            return
        
        # Get transaction info from TRON network
        tx_info = await tron_service.get_transaction_info(deposit.tx_hash)
        if not tx_info:
            return
        
        # Update deposit with transaction info
        update_data = schemas.DepositUpdate(
            confirmations=tx_info["confirmations"],
            from_address=tx_info.get("from_address"),
            amount=tx_info.get("amount")
        )
        
        # Auto-approve if criteria are met
        if (tx_info["success"] and 
            tx_info.get("to_address") == settings.deposit_address and
            tx_info.get("token") == "USDT" and
            tx_info["confirmations"] >= 19):
            update_data.status = models.TransactionStatus.APPROVED
        
        crud.update_deposit(db, deposit_id, update_data)
        
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port, debug=settings.debug)


