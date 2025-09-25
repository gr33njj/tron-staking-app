from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from . import models, schemas
from .auth import get_password_hash


# User CRUD
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_telegram_id(db: Session, telegram_id: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.telegram_id == telegram_id).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_language(db: Session, user_id: int, language_code: str) -> Optional[models.User]:
    db_user = get_user(db, user_id)
    if db_user:
        db_user.language_code = language_code
        db.commit()
        db.refresh(db_user)
    return db_user


# Deposit CRUD
def create_deposit(db: Session, deposit: schemas.DepositCreate, user_id: int) -> models.Deposit:
    # Store with zero amount initially; will be updated by monitor after on-chain verification
    payload = deposit.dict()
    payload["amount"] = Decimal("0")
    db_deposit = models.Deposit(**payload, user_id=user_id)
    db.add(db_deposit)
    db.commit()
    db.refresh(db_deposit)
    return db_deposit


def get_deposit(db: Session, deposit_id: int) -> Optional[models.Deposit]:
    return db.query(models.Deposit).filter(models.Deposit.id == deposit_id).first()


def get_deposit_by_tx_hash(db: Session, tx_hash: str) -> Optional[models.Deposit]:
    return db.query(models.Deposit).filter(models.Deposit.tx_hash == tx_hash).first()


def get_user_deposits(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Deposit]:
    return db.query(models.Deposit).filter(
        and_(
            models.Deposit.user_id == user_id,
            models.Deposit.amount > 0  # Only show deposits with amount > 0
        )
    ).order_by(models.Deposit.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_deposits(db: Session, skip: int = 0, limit: int = 100) -> List[models.Deposit]:
    return db.query(models.Deposit).filter(
        models.Deposit.status == models.TransactionStatus.PENDING
    ).offset(skip).limit(limit).all()


def update_deposit(db: Session, deposit_id: int, deposit_update: schemas.DepositUpdate) -> Optional[models.Deposit]:
    db_deposit = get_deposit(db, deposit_id)
    if db_deposit:
        update_data = deposit_update.dict(exclude_unset=True)
        if deposit_update.status == models.TransactionStatus.APPROVED and not db_deposit.approved_at:
            update_data["approved_at"] = datetime.utcnow()
        
        for field, value in update_data.items():
            setattr(db_deposit, field, value)
        
        db.commit()
        db.refresh(db_deposit)
    return db_deposit


# Accrual CRUD
def create_accrual(db: Session, accrual: schemas.AccrualCreate) -> models.Accrual:
    db_accrual = models.Accrual(**accrual.dict())
    db.add(db_accrual)
    db.commit()
    db.refresh(db_accrual)
    return db_accrual


def get_user_accruals(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Accrual]:
    return db.query(models.Accrual).filter(models.Accrual.user_id == user_id).order_by(models.Accrual.created_at.desc()).offset(skip).limit(limit).all()


# Withdrawal CRUD
def create_withdrawal(db: Session, withdrawal: schemas.WithdrawalCreate, user_id: int) -> models.Withdrawal:
    db_withdrawal = models.Withdrawal(**withdrawal.dict(), user_id=user_id)
    db.add(db_withdrawal)
    db.commit()
    db.refresh(db_withdrawal)
    return db_withdrawal


def get_withdrawal(db: Session, withdrawal_id: int) -> Optional[models.Withdrawal]:
    return db.query(models.Withdrawal).filter(models.Withdrawal.id == withdrawal_id).first()


def get_user_withdrawals(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Withdrawal]:
    return db.query(models.Withdrawal).filter(models.Withdrawal.user_id == user_id).order_by(models.Withdrawal.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_withdrawals(db: Session, skip: int = 0, limit: int = 100) -> List[models.Withdrawal]:
    return db.query(models.Withdrawal).filter(
        models.Withdrawal.status == models.WithdrawalStatus.PENDING
    ).offset(skip).limit(limit).all()


def update_withdrawal(db: Session, withdrawal_id: int, withdrawal_update: schemas.WithdrawalUpdate) -> Optional[models.Withdrawal]:
    db_withdrawal = get_withdrawal(db, withdrawal_id)
    if db_withdrawal:
        update_data = withdrawal_update.dict(exclude_unset=True)
        if withdrawal_update.status in [models.WithdrawalStatus.COMPLETED, models.WithdrawalStatus.APPROVED] and not db_withdrawal.processed_at:
            update_data["processed_at"] = datetime.utcnow()
        
        for field, value in update_data.items():
            setattr(db_withdrawal, field, value)
        
        db.commit()
        db.refresh(db_withdrawal)
    return db_withdrawal


# Balance calculations
def get_user_balance(db: Session, user_id: int) -> schemas.UserBalance:
    # Approved deposits
    approved_deposits = db.query(func.coalesce(func.sum(models.Deposit.amount), 0)).filter(
        and_(models.Deposit.user_id == user_id, models.Deposit.status == models.TransactionStatus.APPROVED)
    ).scalar() or Decimal("0")
    
    # Total accruals
    total_accruals = db.query(func.coalesce(func.sum(models.Accrual.amount), 0)).filter(
        models.Accrual.user_id == user_id
    ).scalar() or Decimal("0")
    
    # Approved or completed withdrawals (subtract from balance once approved)
    withdrawn_sum = db.query(func.coalesce(func.sum(models.Withdrawal.amount), 0)).filter(
        and_(
            models.Withdrawal.user_id == user_id,
            models.Withdrawal.status.in_([models.WithdrawalStatus.APPROVED, models.WithdrawalStatus.COMPLETED])
        )
    ).scalar() or Decimal("0")
    
    # Pending deposits
    pending_deposits = db.query(func.coalesce(func.sum(models.Deposit.amount), 0)).filter(
        and_(models.Deposit.user_id == user_id, models.Deposit.status == models.TransactionStatus.PENDING)
    ).scalar() or Decimal("0")
    
    # Pending withdrawals
    pending_withdrawals = db.query(func.coalesce(func.sum(models.Withdrawal.amount), 0)).filter(
        and_(models.Withdrawal.user_id == user_id, models.Withdrawal.status == models.WithdrawalStatus.PENDING)
    ).scalar() or Decimal("0")
    
    total_balance = approved_deposits + total_accruals - withdrawn_sum
    
    return schemas.UserBalance(
        total_balance=total_balance,
        approved_deposits=approved_deposits,
        total_accruals=total_accruals,
        pending_deposits=pending_deposits,
        pending_withdrawals=pending_withdrawals
    )


# Admin CRUD
def get_admin_by_username(db: Session, username: str) -> Optional[models.AdminUser]:
    return db.query(models.AdminUser).filter(models.AdminUser.username == username).first()


def create_admin_user(db: Session, username: str, password: str) -> models.AdminUser:
    hashed_password = get_password_hash(password)
    db_admin = models.AdminUser(username=username, hashed_password=hashed_password)
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin


# Statistics
def get_admin_stats(db: Session) -> schemas.AdminStats:
    total_users = db.query(models.User).count()
    total_deposits = db.query(func.coalesce(func.sum(models.Deposit.amount), 0)).filter(
        models.Deposit.status == models.TransactionStatus.APPROVED
    ).scalar() or Decimal("0")
    total_accruals = db.query(func.coalesce(func.sum(models.Accrual.amount), 0)).scalar() or Decimal("0")
    total_withdrawals = db.query(func.coalesce(func.sum(models.Withdrawal.amount), 0)).filter(
        models.Withdrawal.status == models.WithdrawalStatus.COMPLETED
    ).scalar() or Decimal("0")
    pending_deposits = db.query(models.Deposit).filter(
        models.Deposit.status == models.TransactionStatus.PENDING
    ).count()
    pending_withdrawals = db.query(models.Withdrawal).filter(
        models.Withdrawal.status == models.WithdrawalStatus.PENDING
    ).count()
    
    return schemas.AdminStats(
        total_users=total_users,
        total_deposits=total_deposits,
        total_accruals=total_accruals,
        total_withdrawals=total_withdrawals,
        pending_deposits=pending_deposits,
        pending_withdrawals=pending_withdrawals
    )


