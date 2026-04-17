const { Bot } = require('grammy');
const axios = require('axios');

// НОВИЙ ТОКЕН
const TOKEN = '8498488320:AAGG5g76J4V5IEhP5H-pAeA-C390NJgbeS8';

// Створюємо бота
const bot = new Bot(TOKEN);

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
    } catch {
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
    } catch {
        return '⚠️ Помилка підключення до сервера погоди';
    }
}

// ------------------ ОБРОБНИКИ КОМАНД ------------------
bot.command('start', async (ctx) => {
    await ctx.reply('👋 Привіт! Я бот-помічник. Надішли /help для списку команд.');
});

bot.command('help', async (ctx) => {
    const helpText = 
        '📋 *Команди бота:*\n\n' +
        '/start - Запустити бота\n' +
        '/help - Показати це повідомлення\n' +
        '/weather - Погода в Нововолинську\n\n' +
        '🧮 *Калькулятор:*\n' +
        'Напиши приклад, наприклад:\n' +
        '`(38+94)*73+29`\n`2+2*2`\n\n' +
        '✅ Бот працює в особистих чатах та бізнес-акаунті!';
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

bot.command('weather', async (ctx) => {
    await ctx.reply('⏳ Отримую погоду...');
    const weatherInfo = await getWeather();
    await ctx.reply(weatherInfo, { parse_mode: 'Markdown' });
});

// ------------------ ОБРОБНИК ТЕКСТОВИХ ПОВІДОМЛЕНЬ ------------------
// Для звичайних чатів (особисті, групи)
bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return; // команди вже оброблені

    const hasDigits = /\d/.test(text);
    const hasOperators = /[+\-*/]/.test(text);
    if (hasDigits && hasOperators) {
        const result = calculateExpression(text);
        if (result) {
            await ctx.reply(result, { parse_mode: 'Markdown' });
        }
    }
});

// ------------------ ОБРОБНИК БІЗНЕС-ПОВІДОМЛЕНЬ (ГОЛОВНЕ) ------------------
// Це те, що робить бота корисним у бізнес-акаунті
bot.on('business_message', async (ctx) => {
    // Отримуємо повідомлення з бізнес-чату
    const msg = ctx.businessMessage;
    const text = msg.text;
    const from = msg.from; // хто надіслав (клієнт або ви)

    // Якщо повідомлення від вас (власника бізнес-акаунта) — ігноруємо, щоб бот не відповідав сам собі
    const me = await bot.api.getMe();
    if (from.id === me.id) return;

    if (!text || text.startsWith('/')) return;

    const hasDigits = /\d/.test(text);
    const hasOperators = /[+\-*/]/.test(text);
    if (hasDigits && hasOperators) {
        const result = calculateExpression(text);
        if (result) {
            // Відповідаємо в той самий бізнес-чат
            await ctx.reply(result, { parse_mode: 'Markdown' });
        }
    } else if (text === '/weather' || text === 'погода') {
        await ctx.reply('⏳ Отримую погоду...');
        const weatherInfo = await getWeather();
        await ctx.reply(weatherInfo, { parse_mode: 'Markdown' });
    }
});

// ------------------ ЗАПУСК БОТА (POLLING) ------------------
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Бот @${botInfo.username} запущений!`);
        console.log(`📌 Працює в особистих чатах, групах та бізнес-акаунті`);
        console.log(`🚀 Очікую повідомлення...`);
    },
});
