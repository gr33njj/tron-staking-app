import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/tron_staking"
    redis_url: str = "redis://localhost:6379"
    
    # Telegram
    telegram_bot_token: str
    telegram_api_id: Optional[str] = None
    telegram_api_hash: Optional[str] = None
    webapp_url: str = "https://obtain-api.online"
    admin_webapp_url: str = "https://admin.obtain-api.online"
    
    # TRON
    tron_api_key: Optional[str] = None
    tron_network: str = "mainnet"  # mainnet or testnet
    deposit_address: str
    hot_wallet_private_key: str
    
    # Security
    secret_key: str
    admin_password: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # Domain
    domain: str = "obtain-api.online"
    admin_domain: str = "admin.obtain-api.online"
    
    # Supported languages
    supported_languages: list = ["en", "ru", "zh"]
    default_language: str = "en"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()




