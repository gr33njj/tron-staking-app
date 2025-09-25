import asyncio
import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
import aiohttp
from datetime import datetime, timedelta

from .config import settings
from .database import SessionLocal
from . import models, crud
from .tron_service import tron_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TronMonitor:
    """Service for monitoring TRON transactions"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.last_block_checked = 0
        self.is_running = False
        
    async def start_monitoring(self):
        """Start the transaction monitoring service"""
        self.is_running = True
        logger.info("Starting TRON transaction monitoring...")
        
        # Create aiohttp session
        self.session = aiohttp.ClientSession()
        
        try:
            while self.is_running:
                await self.check_pending_deposits()
                await self.monitor_new_transactions()
                await asyncio.sleep(30)  # Check every 30 seconds
                
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
        finally:
            if self.session:
                await self.session.close()
    
    async def stop_monitoring(self):
        """Stop the monitoring service"""
        self.is_running = False
        if self.session:
            await self.session.close()
    
    async def check_pending_deposits(self):
        """Check status of pending deposits"""
        db = SessionLocal()
        try:
            # Get all pending deposits
            pending_deposits = crud.get_pending_deposits(db, limit=1000)
            
            for deposit in pending_deposits:
                await self.verify_deposit_transaction(db, deposit)
                
        except Exception as e:
            logger.error(f"Error checking pending deposits: {e}")
        finally:
            db.close()
    
    async def verify_deposit_transaction(self, db, deposit: models.Deposit):
        """Verify a specific deposit transaction"""
        try:
            # Get transaction info from TRON network
            tx_info = await tron_service.get_transaction_info(deposit.tx_hash)
            
            if not tx_info:
                logger.warning(f"Transaction not found: {deposit.tx_hash}")
                return
            
            # Update deposit with latest transaction info
            update_data = {
                "confirmations": tx_info["confirmations"],
                "from_address": tx_info.get("from_address"),
            }
            
            # Set amount if not already set
            if not deposit.amount and tx_info.get("amount"):
                update_data["amount"] = tx_info["amount"]
            
            # Auto-approve if criteria are met
            if self.should_auto_approve(tx_info, deposit):
                update_data["status"] = models.TransactionStatus.APPROVED
                update_data["admin_comment"] = "Auto-approved by system"
                logger.info(f"Auto-approved deposit {deposit.id} for {tx_info['amount']} USDT")
            
            # Auto-reject if invalid
            elif self.should_auto_reject(tx_info, deposit):
                update_data["status"] = models.TransactionStatus.REJECTED
                update_data["admin_comment"] = "Auto-rejected: Invalid transaction"
                logger.info(f"Auto-rejected deposit {deposit.id}")
            
            # Update deposit
            for key, value in update_data.items():
                setattr(deposit, key, value)
            
            db.commit()
            
            # Send notification if status changed
            if update_data.get("status") in [models.TransactionStatus.APPROVED, models.TransactionStatus.REJECTED]:
                await self.notify_user_deposit_status(deposit, update_data["status"])
                await self.notify_admin_deposit_update(deposit, update_data["status"])
            
        except Exception as e:
            logger.error(f"Error verifying deposit {deposit.id}: {e}")
    
    def should_auto_approve(self, tx_info: Dict[str, Any], deposit: models.Deposit) -> bool:
        """Check if transaction should be auto-approved"""
        return (
            tx_info["success"] and
            tx_info.get("to_address") == settings.deposit_address and
            tx_info.get("token") == "USDT" and
            tx_info["confirmations"] >= 19 and
            tx_info.get("amount", 0) > 0
        )
    
    def should_auto_reject(self, tx_info: Dict[str, Any], deposit: models.Deposit) -> bool:
        """Check if transaction should be auto-rejected"""
        return (
            not tx_info["success"] or
            tx_info.get("to_address") != settings.deposit_address or
            tx_info.get("token") != "USDT" or
            tx_info.get("amount", 0) <= 0
        )
    
    async def monitor_new_transactions(self):
        """Monitor new transactions to deposit address"""
        try:
            # This would require implementing a method to scan new blocks
            # For now, we focus on checking pending deposits
            pass
        except Exception as e:
            logger.error(f"Error monitoring new transactions: {e}")
    
    async def notify_user_deposit_status(self, deposit: models.Deposit, status: models.TransactionStatus):
        """Send notification to user about deposit status"""
        try:
            from .bot.main import TronStakingBot
            
            db = SessionLocal()
            user = crud.get_user(db, deposit.user_id)
            db.close()
            
            if user:
                if status == models.TransactionStatus.APPROVED:
                    message = f"✅ Your deposit of {deposit.amount} USDT has been confirmed!"
                elif status == models.TransactionStatus.REJECTED:
                    message = f"❌ Your deposit was rejected. Please contact support."
                else:
                    return
                
                # This would send notification via bot
                # await bot.send_notification(user.telegram_id, message)
                logger.info(f"Notification sent to user {user.telegram_id}: {message}")
            
        except Exception as e:
            logger.error(f"Error sending user notification: {e}")
    
    async def notify_admin_deposit_update(self, deposit: models.Deposit, status: models.TransactionStatus):
        """Send notification to admins about deposit update"""
        try:
            from .bot.main import TronStakingBot
            
            db = SessionLocal()
            user = crud.get_user(db, deposit.user_id)
            db.close()
            
            if user:
                message = f"🔔 Deposit {deposit.id} from {user.first_name} ({user.telegram_id}) was {status.value}"
                
                # This would send notification to admin bot
                # await bot.notify_admins(message)
                logger.info(f"Admin notification: {message}")
            
        except Exception as e:
            logger.error(f"Error sending admin notification: {e}")
    
    async def get_address_transactions(self, address: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent transactions for an address"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # TronGrid API endpoint
            url = f"https://api.trongrid.io/v1/accounts/{address}/transactions/trc20"
            params = {
                "limit": limit,
                "order_by": "block_timestamp,desc"
            }
            
            headers = {}
            if settings.tron_api_key:
                headers["TRON-PRO-API-KEY"] = settings.tron_api_key
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("data", [])
                else:
                    logger.error(f"TronGrid API error: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting address transactions: {e}")
            return []
    
    async def process_new_transaction(self, tx_data: Dict[str, Any]):
        """Process a new transaction found in monitoring"""
        try:
            tx_hash = tx_data.get("transaction_id")
            if not tx_hash:
                return
            
            # Check if we already have this transaction
            db = SessionLocal()
            existing_deposit = crud.get_deposit_by_tx_hash(db, tx_hash)
            if existing_deposit:
                db.close()
                return
            
            # Verify transaction details
            tx_info = await tron_service.get_transaction_info(tx_hash)
            if not tx_info:
                db.close()
                return
            
            # Check if transaction is to our deposit address
            if tx_info.get("to_address") != settings.deposit_address:
                db.close()
                return
            
            # Create notification for admin about unregistered deposit
            amount = tx_info.get("amount", 0)
            from_address = tx_info.get("from_address", "Unknown")
            
            message = f"⚠️ Unregistered deposit detected!\nAmount: {amount} USDT\nFrom: {from_address}\nTX: {tx_hash}"
            logger.warning(message)
            
            # Here you could create a notification in the database
            # or send immediate notification to admins
            
            db.close()
            
        except Exception as e:
            logger.error(f"Error processing new transaction: {e}")


# Global monitor instance
tron_monitor = TronMonitor()


async def start_tron_monitoring():
    """Start TRON monitoring as background task"""
    await tron_monitor.start_monitoring()


async def stop_tron_monitoring():
    """Stop TRON monitoring"""
    await tron_monitor.stop_monitoring()


# Task for checking specific transaction
async def check_transaction_task(tx_hash: str) -> Optional[Dict[str, Any]]:
    """Background task to check a specific transaction"""
    try:
        return await tron_service.get_transaction_info(tx_hash)
    except Exception as e:
        logger.error(f"Error checking transaction {tx_hash}: {e}")
        return None
