import asyncio
import aiohttp
from tronpy import Tron
from tronpy.providers import HTTPProvider
from decimal import Decimal
from typing import Optional, Dict, Any
from .config import settings


class TronService:
    def __init__(self):
        if settings.tron_network == "mainnet":
            self.tron = Tron(HTTPProvider(api_key=settings.tron_api_key))
        else:
            self.tron = Tron(HTTPProvider("https://api.shasta.trongrid.io", api_key=settings.tron_api_key))
        
        # USDT TRC-20 contract address
        self.usdt_contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"  # Mainnet USDT
        self.deposit_address = settings.deposit_address
    
    async def get_transaction_info(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Get transaction information from TRON network"""
        try:
            tx_info = self.tron.get_transaction_info(tx_hash)
            tx = self.tron.get_transaction(tx_hash)
            
            if not tx_info or not tx:
                return None
            
            # Parse transaction data
            result = {
                "tx_hash": tx_hash,
                "block_number": tx_info.get("blockNumber"),
                "confirmations": await self._get_confirmations(tx_info.get("blockNumber", 0)),
                "success": tx_info.get("receipt", {}).get("result") == "SUCCESS",
                "from_address": None,
                "to_address": None,
                "amount": Decimal("0"),
                "token": None,
                "timestamp": tx.get("raw_data", {}).get("timestamp", 0)
            }
            
            # Check if it's a TRC-20 transfer
            if "log" in tx_info:
                for log in tx_info["log"]:
                    if log.get("address") == self.usdt_contract.lower().replace("0x", ""):
                        # Decode TRC-20 transfer
                        topics = log.get("topics", [])
                        data = log.get("data", "")
                        
                        if len(topics) >= 3:
                            # topics[0] = Transfer event signature
                            # topics[1] = from address
                            # topics[2] = to address
                            # data = amount
                            
                            from_addr = "T" + self._hex_to_base58(topics[1][-40:])
                            to_addr = "T" + self._hex_to_base58(topics[2][-40:])
                            amount = int(data, 16) / (10 ** 6)  # USDT has 6 decimals
                            
                            result.update({
                                "from_address": from_addr,
                                "to_address": to_addr,
                                "amount": Decimal(str(amount)),
                                "token": "USDT"
                            })
                            break
            
            return result
            
        except Exception as e:
            print(f"Error getting transaction info: {e}")
            return None
    
    async def _get_confirmations(self, block_number: int) -> int:
        """Get number of confirmations for a transaction"""
        try:
            latest_block = self.tron.get_latest_solid_block_number()
            return max(0, latest_block - block_number + 1)
        except:
            return 0
    
    def _hex_to_base58(self, hex_addr: str) -> str:
        """Convert hex address to base58 (simplified)"""
        # В реальном проекте используйте библиотеку для конвертации
        # Здесь упрощенная версия
        return hex_addr
    
    async def validate_address(self, address: str) -> bool:
        """Validate TRON address"""
        try:
            # Basic validation - TRON addresses start with T and are 34 chars long
            return address.startswith("T") and len(address) == 34
        except:
            return False
    
    async def get_usdt_balance(self, address: str) -> Decimal:
        """Get USDT balance for an address"""
        try:
            contract = self.tron.get_contract(self.usdt_contract)
            balance = contract.functions.balanceOf(address).call()
            return Decimal(str(balance)) / (10 ** 6)  # USDT has 6 decimals
        except:
            return Decimal("0")
    
    async def send_usdt(self, to_address: str, amount: Decimal, private_key: str) -> Optional[str]:
        """Send USDT from hot wallet"""
        try:
            contract = self.tron.get_contract(self.usdt_contract)
            amount_int = int(amount * (10 ** 6))  # Convert to smallest unit
            
            txn = contract.functions.transfer(to_address, amount_int).with_owner(private_key).build()
            result = txn.broadcast()
            
            return result.get("txid")
        except Exception as e:
            print(f"Error sending USDT: {e}")
            return None


# Global instance
tron_service = TronService()


