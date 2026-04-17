const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const TOKEN = '8498488320:AAH38ABgEedG4DcC7lBykyUnVyZrMR2o_cw';

// Функція для скидання з'єднань
async function resetBotConnections() {
    try {
        const tempBot = new TelegramBot(TOKEN, { polling: false });
        await tempBot.deleteWebhook();
        console.log('✅ Webhook видалено');
        await tempBot.stopPolling();
        console.log('✅ Polling зупинено');
    } catch (error) {
        console.log('Помилка скидання:', error.message);
    }
}

// Калькулятор
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

// Погода
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

// Запуск бота
async function startBot() {
    console.log('🔄 Скидання старих з\'єднань...');
    await resetBotConnections();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const bot = new TelegramBot(TOKEN, { 
        polling: true,
        pollingOptions: {
            timeout: 30,
            limit: 100,
            retryTimeout: 5000
        }
    });
    
    console.log('🚀 Бот запущений!');
    
    // КОМАНДА /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, '👋 Привіт! Я бот-помічник.\nНадішли /help для списку команд.');
    });
    
    // КОМАНДА /help
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
            '✅ Бот працює в особистих чатах та бізнес-акаунті!';
        
        bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    });
    
    // КОМАНДА /weather
    bot.onText(/\/weather/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '⏳ Отримую погоду...');
        const weatherInfo = await getWeather();
        await bot.sendMessage(chatId, weatherInfo, { parse_mode: 'Markdown' });
    });
    
    // ОБРОБНИК ВСІХ ПОВІДОМЛЕНЬ (для калькулятора)
    // Це той самий код, але він працює для БУДЬ-ЯКОГО чату
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        // Пропускаємо команди
        if (!text || text.startsWith('/')) return;
        
        console.log(`Повідомлення від ${msg.from.first_name} в чат ${chatId}: ${text}`);
        
        // Перевіряємо, чи це математичний вираз
        const hasDigits = /\d/.test(text);
        const hasOperators = /[+\-*/]/.test(text);
        
        if (hasDigits && hasOperators) {
            const result = calculateExpression(text);
            if (result) {
                await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
                console.log(`✅ Відповідь надіслано в чат ${chatId}`);
            }
        }
    });
    
    bot.getMe().then((botInfo) => {
        console.log(`✅ Бот @${botInfo.username} запущений!`);
        console.log(`📌 Працює в особистих чатах, групах та бізнес-акаунті`);
    });
    
    bot.on('polling_error', (error) => {
        console.error('Помилка polling:', error.message);
    });
}

startBot().catch(console.error);
