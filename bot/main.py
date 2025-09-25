import asyncio
import logging
import sys
import os
from typing import Optional

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import requests
from backend.config import settings
from .translations import get_text

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

# Admin user IDs (можно настроить через переменные окружения)
ADMIN_IDS = [123456789]  # Замените на реальные ID админов

class TronStakingBot:
    def __init__(self):
        self.application = Application.builder().token(settings.telegram_bot_token).build()
        self.api_base = f"http://localhost:{settings.port}/api"
        
        # Add handlers
        self.application.add_handler(CommandHandler("start", self.start))
        self.application.add_handler(CommandHandler("balance", self.balance))
        self.application.add_handler(CommandHandler("help", self.help))
        self.application.add_handler(CommandHandler("deposit", self.deposit_info))
        self.application.add_handler(CommandHandler("stats", self.admin_stats))
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
    
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Start command handler"""
        user = update.effective_user
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        # Register user
        await self.register_user(user)
        
        welcome_text = get_text(lang, "welcome")
        keyboard = await self.get_main_keyboard(lang)
        
        await update.message.reply_text(welcome_text, reply_markup=keyboard)
    
    async def balance(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Balance command handler"""
        user = update.effective_user
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        try:
            # Get balance from API
            response = requests.get(f"{self.api_base}/user/{user.id}/balance")
            if response.status_code == 200:
                balance_data = response.json()
                
                balance_text = get_text(
                    lang, "balance_info",
                    total=balance_data["total_balance"],
                    deposits=balance_data["approved_deposits"],
                    accruals=balance_data["total_accruals"],
                    pending=balance_data["pending_deposits"]
                )
            else:
                balance_text = get_text(lang, "no_balance")
            
            keyboard = await self.get_main_keyboard(lang)
            await update.message.reply_text(balance_text, reply_markup=keyboard)
            
        except Exception as e:
            logger.error(f"Error getting balance: {e}")
            await update.message.reply_text("❌ Error getting balance. Please try again later.")
    
    async def deposit_info(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Deposit info command handler"""
        user = update.effective_user
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        try:
            # Get deposit info from API
            response = requests.get(f"{self.api_base}/deposit-info")
            if response.status_code == 200:
                deposit_data = response.json()
                
                deposit_text = get_text(
                    lang, "deposit_instructions",
                    address=deposit_data["address"]
                )
                
                # Send QR code if available
                if "qr_code" in deposit_data:
                    await update.message.reply_photo(
                        photo=deposit_data["qr_code"],
                        caption=deposit_text,
                        parse_mode="Markdown"
                    )
                else:
                    await update.message.reply_text(deposit_text, parse_mode="Markdown")
            else:
                await update.message.reply_text("❌ Error getting deposit information.")
                
        except Exception as e:
            logger.error(f"Error getting deposit info: {e}")
            await update.message.reply_text("❌ Error getting deposit information.")
    
    async def admin_stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Admin stats command handler"""
        user = update.effective_user
        
        if user.id not in ADMIN_IDS:
            await update.message.reply_text("❌ Access denied.")
            return
        
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        try:
            # Get admin stats from API
            response = requests.get(f"{self.api_base}/admin/stats")
            if response.status_code == 200:
                stats_data = response.json()
                
                stats_text = get_text(
                    lang, "admin_stats",
                    users=stats_data["total_users"],
                    deposits=stats_data["total_deposits"],
                    accruals=stats_data["total_accruals"],
                    withdrawals=stats_data["total_withdrawals"],
                    pending_deposits=stats_data["pending_deposits"],
                    pending_withdrawals=stats_data["pending_withdrawals"]
                )
                
                await update.message.reply_text(stats_text)
            else:
                await update.message.reply_text("❌ Error getting statistics.")
                
        except Exception as e:
            logger.error(f"Error getting admin stats: {e}")
            await update.message.reply_text("❌ Error getting statistics.")
    
    async def help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Help command handler"""
        user = update.effective_user
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        help_text = """
🤖 <b>Available Commands:</b>

/start - Start the bot
/balance - Check your balance
/deposit - Get deposit instructions
/help - Show this help message

🌐 <b>WebApp Features:</b>
• View detailed balance and history
• Submit deposit transactions
• Request withdrawals
• Track earnings

💡 <b>Use the buttons below or open WebApp for full functionality!</b>
        """
        
        keyboard = await self.get_main_keyboard(lang)
        await update.message.reply_text(help_text, reply_markup=keyboard, parse_mode="HTML")
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle button callbacks"""
        query = update.callback_query
        await query.answer()
        
        user = query.from_user
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        if query.data == "balance":
            await self.balance(update, context)
        elif query.data == "deposit":
            await self.deposit_info(update, context)
        elif query.data == "language":
            await self.show_language_menu(query, user)
        elif query.data.startswith("lang_"):
            new_lang = query.data.split("_")[1]
            await self.change_language(query, user, new_lang)
        elif query.data == "support":
            support_text = get_text(lang, "support_message")
            await query.edit_message_text(support_text)
    
    async def show_language_menu(self, query, user):
        """Show language selection menu"""
        lang = user.language_code if user.language_code in ["en", "ru", "zh"] else "en"
        
        keyboard = [
            [InlineKeyboardButton("🇺🇸 English", callback_data="lang_en")],
            [InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru")],
            [InlineKeyboardButton("🇨🇳 中文", callback_data="lang_zh")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        text = get_text(lang, "select_language")
        await query.edit_message_text(text, reply_markup=reply_markup)
    
    async def change_language(self, query, user, new_lang):
        """Change user language"""
        # Update user language in database via API
        # This would require an API endpoint to update user language
        
        text = get_text(new_lang, "language_changed")
        keyboard = await self.get_main_keyboard(new_lang)
        
        await query.edit_message_text(text, reply_markup=keyboard)
    
    async def get_main_keyboard(self, lang: str):
        """Get main keyboard with WebApp button"""
        webapp_url = f"{settings.webapp_url}?lang={lang}"
        
        keyboard = [
            [
                InlineKeyboardButton(
                    get_text(lang, "webapp_button"),
                    web_app=WebAppInfo(url=webapp_url)
                )
            ],
            [
                InlineKeyboardButton(get_text(lang, "deposit_button"), callback_data="deposit"),
                InlineKeyboardButton(get_text(lang, "balance_title"), callback_data="balance")
            ],
            [
                InlineKeyboardButton(get_text(lang, "language_button"), callback_data="language"),
                InlineKeyboardButton(get_text(lang, "support_button"), callback_data="support")
            ]
        ]
        
        return InlineKeyboardMarkup(keyboard)
    
    async def register_user(self, user):
        """Register user via API"""
        try:
            user_data = {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "language_code": user.language_code or "en"
            }
            
            response = requests.post(f"{self.api_base}/auth/telegram", json=user_data)
            logger.info(f"User registration response: {response.status_code}")
            
        except Exception as e:
            logger.error(f"Error registering user: {e}")
    
    async def send_notification(self, user_id: int, message: str):
        """Send notification to user"""
        try:
            await self.application.bot.send_message(chat_id=user_id, text=message)
        except Exception as e:
            logger.error(f"Error sending notification to {user_id}: {e}")
    
    async def notify_admins(self, message: str):
        """Send notification to all admins"""
        for admin_id in ADMIN_IDS:
            try:
                await self.application.bot.send_message(chat_id=admin_id, text=message)
            except Exception as e:
                logger.error(f"Error sending admin notification to {admin_id}: {e}")
    
    def run(self):
        """Start the bot"""
        logger.info("Starting TRON Staking Bot...")
        self.application.run_polling()


async def main():
    """Main function"""
    bot = TronStakingBot()
    bot.run()


if __name__ == "__main__":
    asyncio.run(main())




