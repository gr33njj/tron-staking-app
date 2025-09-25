import httpx
from .config import settings

TELEGRAM_BOT_API = f"https://api.telegram.org/bot{settings.telegram_bot_token}"

NOTIFICATION_MESSAGES = {
    "en": {
        "deposit_created": "Your deposit request (TX: {tx_hash}) has been created. Please wait for at least 19 network confirmations.",
        "deposit_approved": "Your deposit of {amount} USDT has been approved and credited to your account!",
        "deposit_rejected": "Your deposit request (TX: {tx_hash}) has been rejected. Please contact support for details.",
        "withdrawal_created": "Your withdrawal request for {amount} USDT has been submitted. We will process it shortly.",
        "withdrawal_approved": "Your withdrawal of {amount} USDT has been approved and is being processed.",
        "withdrawal_rejected": "Your withdrawal request for {amount} USDT has been rejected. Please contact support for details.",
        "withdrawal_completed": "Your withdrawal of {amount} USDT has been completed! TX: {tx_hash}",
        "accrual_created": "Earnings accrued: {amount} USDT has been added to your balance!"
    },
    "ru": {
        "deposit_created": "Ваша заявка на депозит (TX: {tx_hash}) создана. Ожидайте минимум 19 подтверждений сети.",
        "deposit_approved": "Ваш депозит в размере {amount} USDT одобрен и зачислен на ваш счет!",
        "deposit_rejected": "Ваша заявка на депозит (TX: {tx_hash}) отклонена. Пожалуйста, свяжитесь со службой поддержки для получения подробной информации.",
        "withdrawal_created": "Ваша заявка на вывод {amount} USDT принята. Мы обработаем ее в ближайшее время.",
        "withdrawal_approved": "Ваш вывод {amount} USDT одобрен и находится в обработке.",
        "withdrawal_rejected": "Ваша заявка на вывод {amount} USDT отклонена. Пожалуйста, свяжитесь со службой поддержки для получения подробной информации.",
        "withdrawal_completed": "Ваш вывод {amount} USDT завершен! TX: {tx_hash}",
        "accrual_created": "Начисление прибыли: {amount} USDT добавлено на ваш баланс!"
    },
    "zh": {
        "deposit_created": "您的存款请求 (TX: {tx_hash}) 已创建。请等待至少19个网络确认。",
        "deposit_approved": "您的 {amount} USDT 存款已批准并已存入您的账户！",
        "deposit_rejected": "您的存款请求 (TX: {tx_hash}) 已被拒绝。请联系客服获取详情。",
        "withdrawal_created": "您的 {amount} USDT 提款请求已提交。我们将尽快处理。",
        "withdrawal_approved": "您的 {amount} USDT 提款已批准并正在处理中。",
        "withdrawal_rejected": "您的 {amount} USDT 提款请求已被拒绝。请联系客服获取详情。",
        "withdrawal_completed": "您的 {amount} USDT 提款已完成！TX: {tx_hash}",
        "accrual_created": "收益已到账：{amount} USDT 已添加到您的余额！"
    }
}

async def send_telegram_notification(telegram_id: str, message_key: str, params: dict = {}, lang_code: str = "en"):
    """Sends a localized notification message to a Telegram user."""
    if not settings.telegram_bot_token:
        print("Telegram bot token not configured. Skipping notification.")
        return

    # Fetch user's language preference from DB if available, otherwise use default
    # For now, we'll use the provided lang_code or default to 'en'
    
    message_template = NOTIFICATION_MESSAGES.get(lang_code, NOTIFICATION_MESSAGES["en"]).get(message_key)
    if not message_template:
        print(f"No message template found for key: {message_key} in language: {lang_code}")
        return

    message_text = message_template.format(**params)

    payload = {
        "chat_id": telegram_id,
        "text": message_text,
        "parse_mode": "HTML"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{TELEGRAM_BOT_API}/sendMessage", json=payload)
            response.raise_for_status()
            print(f"Notification sent to {telegram_id}: {message_text}")
        except httpx.HTTPStatusError as e:
            print(f"Error sending Telegram notification to {telegram_id}: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            print(f"Network error sending Telegram notification to {telegram_id}: {e}")


def notify_user(telegram_id: str, message: str) -> None:
    """Send a Telegram notification to the user via Bot API.

    Best-effort: ignore errors to not break main flow.
    """
    try:
        if not settings.telegram_bot_token or not telegram_id:
            return
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": telegram_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        import requests
        requests.post(url, json=payload, timeout=5)
    except Exception:
        # Do not raise
        pass