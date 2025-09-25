from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from .models import TransactionStatus, WithdrawalStatus, WithdrawalType


# User schemas
class UserBase(BaseModel):
    telegram_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language_code: str = "en"


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Deposit schemas
class DepositBase(BaseModel):
    tx_hash: str
    comment: Optional[str] = None


class DepositCreate(DepositBase):
    pass


class Deposit(DepositBase):
    id: int
    user_id: int
    amount: Decimal
    status: TransactionStatus
    admin_comment: Optional[str] = None
    confirmations: int
    from_address: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Accrual schemas
class AccrualBase(BaseModel):
    amount: Decimal
    description: Optional[str] = None


class AccrualCreate(AccrualBase):
    user_id: int
    admin_comment: Optional[str] = None


class Accrual(AccrualBase):
    id: int
    user_id: int
    admin_comment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Withdrawal schemas
class WithdrawalBase(BaseModel):
    amount: Decimal
    to_address: str
    withdrawal_type: WithdrawalType


class WithdrawalCreate(WithdrawalBase):
    pass


class Withdrawal(WithdrawalBase):
    id: int
    user_id: int
    status: WithdrawalStatus
    tx_hash: Optional[str] = None
    admin_comment: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Balance schema
class UserBalance(BaseModel):
    total_balance: Decimal
    approved_deposits: Decimal
    total_accruals: Decimal
    pending_deposits: Decimal
    pending_withdrawals: Decimal


# Dashboard schema
class Dashboard(BaseModel):
    balance: UserBalance
    recent_transactions: List[Deposit]
    recent_accruals: List[Accrual]
    recent_withdrawals: List[Withdrawal]
    next_accrual_date: Optional[datetime] = None


# Admin schemas
class AdminLogin(BaseModel):
    username: str
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str


class DepositUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    admin_comment: Optional[str] = None
    amount: Optional[Decimal] = None
    from_address: Optional[str] = None
    confirmations: Optional[int] = None


class WithdrawalUpdate(BaseModel):
    status: WithdrawalStatus
    admin_comment: Optional[str] = None
    tx_hash: Optional[str] = None


# Statistics
class AdminStats(BaseModel):
    total_users: int
    total_deposits: Decimal
    total_accruals: Decimal
    total_withdrawals: Decimal
    pending_deposits: int
    pending_withdrawals: int




