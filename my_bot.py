import logging
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# ------------------ НАЛАШТУВАННЯ ------------------
# ВСТАВ СВІЙ ТОКЕН СЮДИ:
TOKEN = "ТВІЙ_ТОКЕН_ТУТ"

# Вмикаємо логування (щоб бачити помилки)
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# ------------------ ФУНКЦІЯ ПОГОДИ ------------------
async def get_weather():
    """Отримує погоду для Нововолинська з wttr.in (безкоштовно, без API-ключа)"""
    try:
        # wttr.in повертає гарну текстову погоду. ?format=... робить коротко
        url = "https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            # Очищаємо від зайвих пробілів
            weather_text = response.text.strip()
            return f"🌡 *Погода в Нововолинську:*\n{weather_text}"
        else:
            return "❌ Не вдалося отримати погоду. Спробуй пізніше."
    except Exception as e:
        logger.error(f"Помилка погоди: {e}")
        return "⚠️ Помилка підключення до сервера погоди."

# ------------------ КАЛЬКУЛЯТОР ------------------
def safe_eval(expression: str):
    """Безпечно обчислює математичний вираз. Повертає рядок з результатом або помилкою."""
    # Дозволяємо тільки цифри, оператори + - * / ( ) . та пробіли
    # Також прибираємо знак = в кінці, якщо є
    expression = expression.strip().replace("=", "").replace(" ", "")
    
    # Перевіряємо, чи тільки дозволені символи
    allowed_chars = "0123456789+-*/()."
    if not all(c in allowed_chars for c in expression):
        return "❌ Помилка: дозволені лише цифри, + - * / ( ) ."
    
    try:
        # eval() - небезпечний, але з фільтром символів - прийнятно для простого калькулятора
        # Обмежуємо глобальні/локальні змінні, щоб не можна було викликати функції
        result = eval(expression, {"__builtins__": None}, {})
        # Округлюємо, якщо число з плаваючою крапкою
        if isinstance(result, float):
            # Якщо результат майже цілий - показуємо як ціле
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
    # Надсилаємо "Зачекай..." поки ходимо за погодою
    await update.message.reply_text("⏳ Отримую погоду для Нововолинська...")
    weather_info = await get_weather()
    await update.message.reply_text(weather_info, parse_mode="Markdown")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обробляє всі текстові повідомлення (для калькулятора)"""
    text = update.message.text.strip()
    
    # Якщо це не схоже на математичний вираз - ігноруємо
    # Перевіряємо наявність цифр або дужок (щоб не реагувати на звичайні слова)
    if any(c.isdigit() for c in text) or '(' in text or ')' in text:
        # Якщо є хоча б один математичний оператор + - * /
        if any(op in text for op in ['+', '-', '*', '/']):
            result = safe_eval(text)
            await update.message.reply_text(result, parse_mode="Markdown")
    # Якщо не підійшло під калькулятор - нічого не відповідаємо

# ------------------ ГОЛОВНА ФУНКЦІЯ ------------------
def main():
    # Створюємо додаток
    app = Application.builder().token(TOKEN).build()

    # Додаємо обробники команд
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("weather", weather_command))
    
    # Обробник всіх текстових повідомлень (для калькулятора)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Запускаємо бота
    print("✅ Бот запущений...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
