import logging
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import os

# ------------------ ТВІЙ ТОКЕН ------------------
TOKEN = "8498488320:AAH38ABgEedG4DcC7lBykyUnVyZrMR2o_cw"

# ------------------ НАЛАШТУВАННЯ ------------------
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

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
        # Використовуємо HTML замість Markdown
        return f"📝 <b>Приклад:</b> <code>{expression}</code>\n✅ <b>Відповідь:</b> {result}"
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
        "📋 <b>Список команд:</b>\n\n"
        "/start - Запустити бота\n"
        "/help - Показати це повідомлення\n"
        "/weather - Погода в Нововолинську\n\n"
        "🧮 <b>Калькулятор:</b>\n"
        "Просто напиши математичний приклад, наприклад:\n"
        "<code>(38+94)*73+29</code>\n"
        "або <code>2+2*2</code>\n\n"
        "Дозволені операції: + - * / ( ) ."
    )
    await update.message.reply_text(help_text, parse_mode="HTML")

async def weather_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("⏳ Отримую погоду для Нововолинська...")
    weather_info = await get_weather()
    await update.message.reply_text(weather_info, parse_mode="Markdown")  # Для погоди Markdown підходить

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    # Перевіряємо, чи схоже на математичний вираз
    if any(c.isdigit() for c in text) or '(' in text or ')' in text:
        if any(op in text for op in ['+', '-', '*', '/']):
            result = safe_eval(text)
            await update.message.reply_text(result, parse_mode="HTML")

# ------------------ ЗАПУСК (LONG POLLING) ------------------
def main():
    """Запуск бота через довге опитування - не потребує домену"""
    print("🚀 Бот запускається...")
    
    # Створюємо бота
    app = Application.builder().token(TOKEN).build()
    
    # Додаємо обробники
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("weather", weather_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Запускаємо polling
    print("✅ Бот працює! Очікую повідомлення...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
