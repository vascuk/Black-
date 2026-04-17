const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// ------------------ ТВІЙ ТОКЕН ------------------
const TOKEN = '8498488320:AAF6NavsysnUgVBmLFnPXFhF3zQbXHVoFQo';

// Створюємо бота з налаштуваннями для бізнес-акаунта
const bot = new TelegramBot(TOKEN, { 
    polling: true,
    // Дозволяємо обробку повідомлень з бізнес-акаунтів
    onlyFirstMatch: false
});

console.log('🚀 Бот запущений для бізнес-акаунта!');

// ------------------ КАЛЬКУЛЯТОР ------------------
function calculateExpression(expression) {
    let expr = expression.trim().replace(/=$/, '').replace(/\s/g, '');
    
    if (!/[+\-*/]/.test(expr)) return null;
    
    if (!/^[0-9+\-*/().]+$/.test(expr)) {
        return '❌ Дозволені лише цифри, + - * / ( ) .';
    }
    
    try {
        const result = Function('"use strict";return (' + expr + ')')();
        let finalResult = result;
        if (typeof result === 'number' && !Number.isInteger(result)) {
            finalResult = Math.round(result * 100000) / 100000;
        }
        return `📝 *Приклад:* \`${expr}\`\n✅ *Відповідь:* ${finalResult}`;
    } catch (error) {
        return '❌ Неправильний вираз (перевір дужки)';
    }
}

// ------------------ ПОГОДА ------------------
async function getWeather() {
    try {
        const url = 'https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk';
        const response = await axios.get(url, { timeout: 10000 });
        if (response.status === 200 && response.data) {
            return `🌡 *Погода в Нововолинську:*\n${response.data.trim()}`;
        }
        return '❌ Не вдалося отримати погоду';
    } catch (error) {
        return '⚠️ Помилка підключення до сервера погоди';
    }
}

// ------------------ КОМАНДИ ДЛЯ БІЗНЕС-АКАУНТА ------------------
// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    console.log(`Команда /start в чаті типу: ${chatType}`);
    bot.sendMessage(chatId, '👋 Привіт! Я бот для вашого бізнес-акаунта.\nНадішли /help для списку команд.');
});

// Команда /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = 
        '📋 *Команди бота:*\n\n' +
        '/start - Запустити бота\n' +
        '/help - Показати це повідомлення\n' +
        '/weather - Погода в Нововолинську\n\n' +
        '🧮 *Калькулятор:*\n' +
        'Напиши приклад, наприклад:\n' +
        '`(38+94)*73+29`\n' +
        '`2+2*2`\n\n' +
        '✅ Бот працює у вашому бізнес-акаунті!';
    
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Команда /weather
bot.onText(/\/weather/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '⏳ Отримую погоду для Нововолинська...');
    const weatherInfo = await getWeather();
    await bot.sendMessage(chatId, weatherInfo, { parse_mode: 'Markdown' });
});

// ------------------ ОБРОБНИК ПОВІДОМЛЕНЬ В БІЗНЕС-ЧАТІ ------------------
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const chatType = msg.chat.type;
    
    // Пропускаємо команди
    if (!text || text.startsWith('/')) return;
    
    console.log(`[${chatType}] Повідомлення: ${text}`);
    
    // Перевіряємо, чи це математичний вираз
    const hasDigits = /\d/.test(text);
    const hasOperators = /[+\-*/]/.test(text);
    
    if (hasDigits && hasOperators) {
        const result = calculateExpression(text);
        if (result) {
            await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
            console.log(`Відповідь надіслано в чат ${chatId}`);
        }
    }
});

// ------------------ ПЕРЕВІРКА ПІДКЛЮЧЕННЯ ------------------
bot.getMe().then((botInfo) => {
    console.log(`✅ Бот @${botInfo.username} запущений!`);
    console.log(`📌 Очікую повідомлення в бізнес-акаунті...`);
});

bot.on('polling_error', (error) => {
    console.error('Помилка polling:', error.message);
});

console.log('🚀 Бот готовий до роботи в бізнес-акаунті!');
