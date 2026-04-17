import logging
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
import uvicorn
import os

# ------------------ ТВІЙ ТОКЕН (ТЕСТОВИЙ) ------------------
TOKEN = "8498488320:AAH38ABgEedG4DcC7lBykyUnVyZrMR2o_cw"

# ------------------ НАЛАШТУВАННЯ ------------------
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

RAILWAY_URL = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
if RAILWAY_URL:
    WEBHOOK_URL = f"https://{RAILWAY_URL}/webhook"
    logger.info(f"🌐 Webhook URL: {WEBHOOK_URL}")
else:
    WEBHOOK_URL = None
    logger.warning("⚠️ RAILWAY_PUBLIC_DOMAIN не знайдено")

# ------------------ ПОГОДА ------------------
async def get_weather():
    try:
        url = "https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return f"🌡 *Погода в Нововолинську:*\n{response.text.strip()}"
        return "❌ Не вдалося отримати погоду."
    except Exception as e:
        logger.error(f"Помилка погоди: {e}")
        return "⚠️ Помилка підключення до сервера погоди."

# ------------------ КАЛЬКУЛЯТОР ------------------
def safe_eval(expression: str):
    expression = expression.strip().replace("=", "").replace(" ", "")
    allowed_chars = "0123456789+-*/()."
    if not all(c in allowed_chars for c in expression):
        return "❌ Помилка: дозволені лише цифри, + - * / ( ) ."
    try:
        result = eval(expression, {"__builtins__": None}, {})
        if isinstance(result, float):
            if result.is_integer():
                result = int(result)
            else:
                result = round(result, 5)
        return f"📝 *Приклад:* `{expression}`\n✅ *Відповідь:* {result}"
    except ZeroDivisionError:
        return "❌ Помилка: ділення на нуль!"
    except Exception:
        return "❌ Помилка: неправильний вираз (перевір дужки або оператори)."

# ------------------ КОМАНДИ ------------------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Привіт! Я твій особистий бот.\n"
        "Надішли мені /help, щоб побачити всі команди."
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "*📋 Список команд:*\n\n"
        "/start - Запустити бота\n"
        "/help - Показати це повідомлення\n"
        "/weather - Погода в Нововолинську\n\n"
        "*🧮 Калькулятор:*\n"
        "Просто напиши математичний приклад, наприклад:\n"
        "`(38+94)*73+29`\n"
        "або `2+2*2`\n\n"
        "Дозволені операції: + - * / ( ) ."
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")

async def weather_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("⏳ Отримую погоду для Нововолинська...")
    weather_info = await get_weather()
    await update.message.reply_text(weather_info, parse_mode="Markdown")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    # Перевіряємо, чи схоже на математичний вираз
    if any(c.isdigit() for c in text) or '(' in text or ')' in text:
        if any(op in text for op in ['+', '-', '*', '/']):
            result = safe_eval(text)
            await update.message.reply_text(result, parse_mode="Markdown")

# ------------------ FASTAPI + WEBHOOK ------------------
application = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global application
    logger.info("🚀 Запуск бота...")
    
    # Створюємо бота
    application = Application.builder().token(TOKEN).updater(None).build()
    
    # Додаємо обробники
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("weather", weather_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    await application.initialize()
    
    # Встановлюємо webhook
    if WEBHOOK_URL:
        await application.bot.set_webhook(WEBHOOK_URL)
        logger.info(f"✅ Webhook успішно встановлено: {WEBHOOK_URL}")
    else:
        logger.warning("⚠️ Webhook не встановлено (немає RAILWAY_PUBLIC_DOMAIN)")
    
    yield
    
    # Чистка при завершенні
    await application.bot.delete_webhook()
    await application.shutdown()
    logger.info("🛑 Бот зупинено")

app = FastAPI(lifespan=lifespan)

@app.post("/webhook")
async def webhook(request: Request):
    """Telegram надсилатиме оновлення сюди"""
    if application is None:
        logger.error("❌ Application не ініціалізовано")
        return {"status": "error", "message": "Bot not ready"}
    
    try:
        data = await request.json()
        update = Update.de_json(data, application.bot)
        await application.process_update(update)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Помилка webhook: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/")
async def root():
    return {"status": "alive", "bot": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ------------------ ЗАПУСК ------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🔥 Запуск сервера на порту {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
