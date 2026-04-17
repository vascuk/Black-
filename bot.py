import os
import logging
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
import uvicorn

# ------------------ НАЛАШТУВАННЯ ------------------
TOKEN = os.getenv("8498488320:AAH38ABgEedG4DcC7lBykyUnVyZrMR2o_cw")  # Токен зі змінних оточення Railway
if not TOKEN:
    raise ValueError("❌ Потрібно встановити змінну TELEGRAM_BOT_TOKEN в Railway!")

# Webhook URL (Railway сам дасть тобі домен, наприклад https://назва.up.railway.app)
# WEBHOOK_URL = os.getenv("RAILWAY_PUBLIC_DOMAIN")  # Railway автоматично підставляє
# Але простіше зібрати зі змінної:
RAILWAY_URL = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
if RAILWAY_URL:
    WEBHOOK_URL = f"https://{RAILWAY_URL}/webhook"
else:
    WEBHOOK_URL = None
    print("⚠️ RAILWAY_PUBLIC_DOMAIN не знайдено, webhook може не працювати")

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# ------------------ ФУНКЦІЯ ПОГОДИ ------------------
async def get_weather():
    try:
        url = "https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            weather_text = response.text.strip()
            return f"🌡 *Погода в Нововолинську:*\n{weather_text}"
        else:
            return "❌ Не вдалося отримати погоду. Спробуй пізніше."
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

# ------------------ ОБРОБНИКИ КОМАНД ------------------
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
        "або зі знаком = в кінці: `(38+94)*73+29=`\n"
        "Бот вирішить і дасть відповідь.\n\n"
        "Дозволені операції: + - * / ( ) ."
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")

async def weather_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("⏳ Отримую погоду для Нововолинська...")
    weather_info = await get_weather()
    await update.message.reply_text(weather_info, parse_mode="Markdown")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if any(c.isdigit() for c in text) or '(' in text or ')' in text:
        if any(op in text for op in ['+', '-', '*', '/']):
            result = safe_eval(text)
            await update.message.reply_text(result, parse_mode="Markdown")

# ------------------ FASTAPI ДЛЯ WEBHOOK ------------------
application = None  # глобальний об'єкт бота

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Старт бота
    global application
    application = (
        Application.builder()
        .token(TOKEN)
        .updater(None)  # без polling, бо webhook
        .build()
    )
    
    # Додаємо обробники
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("weather", weather_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    await application.initialize()
    
    # Встановлюємо webhook
    if WEBHOOK_URL:
        await application.bot.set_webhook(WEBHOOK_URL)
        logger.info(f"✅ Webhook встановлено: {WEBHOOK_URL}")
    else:
        logger.warning("⚠️ WEBHOOK_URL не встановлено")
    
    yield
    
    # Фіналізація
    await application.bot.delete_webhook()
    await application.shutdown()

app = FastAPI(lifespan=lifespan)

@app.post("/webhook")
async def webhook(request: Request):
    """Приймає оновлення від Telegram"""
    if application is None:
        return {"status": "error", "message": "Bot not ready"}
    
    data = await request.json()
    update = Update.de_json(data, application.bot)
    await application.process_update(update)
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"status": "alive", "message": "Telegram bot is running"}

# ------------------ ЗАПУСК ДЛЯ RAILWAY ------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
