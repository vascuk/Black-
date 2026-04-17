const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// ------------------ ТВІЙ ТОКЕН ------------------
// Встав свій токен сюди (або в .env файл)
const TOKEN = '8498488320:AAH38ABgEedG4DcC7lBykyUnVyZrMR2o_cw';

// Створюємо бота (polling mode - не потребує домену)
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🚀 Бот запущений! Очікую повідомлення...');

// ------------------ ФУНКЦІЯ КАЛЬКУЛЯТОРА ------------------
function calculateExpression(expression) {
    // Видаляємо знак = в кінці та пробіли
    let expr = expression.trim().replace(/=$/, '').replace(/\s/g, '');
    
    // Перевірка на дозволені символи (лише цифри, оператори, дужки, крапка)
    if (!/^[0-9+\-*/().]+$/.test(expr)) {
        return '❌ Помилка: дозволені лише цифри, + - * / ( ) .';
    }
    
    try {
        // Обчислюємо вираз (безпечно через Function)
        const result = Function('"use strict";return (' + expr + ')')();
        
        // Округлюємо результат
        let finalResult = result;
        if (typeof result === 'number' && !Number.isInteger(result)) {
            finalResult = Math.round(result * 100000) / 100000;
        }
        
        return `📝 *Приклад:* \`${expr}\`\n✅ *Відповідь:* ${finalResult}`;
    } catch (error) {
        return '❌ Помилка: неправильний вираз (перевір дужки або оператори)';
    }
}

// ------------------ ФУНКЦІЯ ПОГОДИ ------------------
async function getWeather() {
    try {
        const url = 'https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk';
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.status === 200 && response.data) {
            const weatherText = response.data.trim();
            return `🌡 *Погода в Нововолинську:*\n${weatherText}`;
        } else {
            return '❌ Не вдалося отримати погоду. Спробуй пізніше.';
        }
    } catch (error) {
        console.error('Помилка погоди:', error.message);
        return '⚠️ Помилка підключення до сервера погоди.';
    }
}

// ------------------ ОБРОБНИК КОМАНД ------------------
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '👋 Привіт! Я твій особистий бот.\nНадішли мені /help, щоб побачити всі команди.');
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = 
        '*📋 Список команд:*\n\n' +
        '/start - Запустити бота\n' +
        '/help - Показати це повідомлення\n' +
        '/weather - Погода в Нововолинську\n\n' +
        '*🧮 Калькулятор:*\n' +
        'Просто напиши математичний приклад, наприклад:\n' +
        '`(38+94)*73+29`\n' +
        'або `2+2*2`\n\n' +
        'Дозволені операції: + - * / ( ) .';
    
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/weather/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '⏳ Отримую погоду для Нововолинська...');
    
    const weatherInfo = await getWeather();
    bot.sendMessage(chatId, weatherInfo, { parse_mode: 'Markdown' });
});

// ------------------ ОБРОБНИК ТЕКСТОВИХ ПОВІДОМЛЕНЬ (КАЛЬКУЛЯТОР) ------------------
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Ігноруємо команди (вони вже оброблені)
    if (text.startsWith('/')) return;
    
    // Перевіряємо, чи є в тексті цифри та математичні оператори
    const hasDigits = /\d/.test(text);
    const hasOperators = /[+\-*/]/.test(text);
    const hasParentheses = /[()]/.test(text);
    
    if (hasDigits && (hasOperators || hasParentheses)) {
        const result = calculateExpression(text);
        bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
    }
});

// ------------------ ОБРОБКА ПОМИЛОК ------------------
bot.on('polling_error', (error) => {
    console.error('Помилка polling:', error);
});

console.log('✅ Бот готовий до роботи!');
