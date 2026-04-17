const { Bot } = require('grammy');
const axios = require('axios');

// ТОКЕН (вставте свій)
const TOKEN = '8498488320:AAFR7V3Da-4Hp6oG_COKQBKommNBnGA43y4';

const bot = new Bot(TOKEN);

// ------------------ КАЛЬКУЛЯТОР ------------------
function calculate(expression) {
    let expr = expression.trim().replace(/=$/, '').replace(/\s/g, '');
    if (!/^[0-9+\-*/().]+$/.test(expr)) return null;
    try {
        let result = Function('"use strict";return (' + expr + ')')();
        result = Math.round(result * 100000) / 100000;
        return `📝 *${expr}* = ${result}`;
    } catch {
        return null;
    }
}

// ------------------ ПОГОДА ------------------
async function getWeather() {
    try {
        const url = 'https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk';
        const response = await axios.get(url, { timeout: 10000 });
        return `🌡 *Погода в Нововолинську:*\n${response.data.trim()}`;
    } catch {
        return '⚠️ Помилка отримання погоди';
    }
}

// ------------------ КОМАНДИ ------------------
bot.command('start', async (ctx) => {
    await ctx.reply('👋 Вітаю! Я бот-помічник.\nНапишіть /help для списку команд.');
});

bot.command('help', async (ctx) => {
    await ctx.reply(
        '📋 *Команди:*\n/start - запуск\n/help - допомога\n/weather - погода\n\n🧮 *Калькулятор:* просто надішліть приклад, наприклад `2+2*2`',
        { parse_mode: 'Markdown' }
    );
});

bot.command('weather', async (ctx) => {
    await ctx.reply('⏳ Отримую погоду...');
    const weatherText = await getWeather();
    await ctx.reply(weatherText, { parse_mode: 'Markdown' });
});

// ------------------ КАЛЬКУЛЯТОР ДЛЯ ВСІХ ПОВІДОМЛЕНЬ ------------------
// Цей обробник спрацьовує для будь-якого текстового повідомлення (особисті, групи, бізнес-чати)
bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return; // команди вже оброблені

    const result = calculate(text);
    if (result) {
        await ctx.reply(result, { parse_mode: 'Markdown' });
    }
});

// ------------------ МЕНЮ КОМАНД (підказка при введенні /) ------------------
bot.api.setMyCommands([
    { command: 'start', description: '🚀 Запустити бота' },
    { command: 'help', description: '❓ Допомога' },
    { command: 'weather', description: '🌡 Погода в Нововолинську' },
]);

// ------------------ ЗАПУСК ------------------
bot.start().then(() => {
    console.log('✅ Бот успішно запущений!');
    console.log('📌 Працює в особистих чатах, групах та бізнес-акаунті');
    console.log('🚀 Очікую повідомлення...');
}).catch((err) => {
    console.error('❌ Помилка запуску:', err);
});
