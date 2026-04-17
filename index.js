const { Bot } = require('grammy');
const axios = require('axios');

// ТОКЕН ВСТАВЛЕНИЙ БЕЗПОСЕРЕДНЬО (для тесту)
const TOKEN = '8498488320:AAGG5g76J4V5IEhP5H-pAeA-C390NJgbeS8';

console.log('🚀 Запуск бота з прямим токеном...');

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

// ------------------ ФУНКЦІЯ СКИДАННЯ КОНФЛІКТУ ------------------
async function resetBotConnections() {
    console.log('🔄 Скидання старих з\'єднань...');
    const tempBot = new Bot(TOKEN);
    try {
        await tempBot.api.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook видалено');
    } catch (e) {
        console.log('⚠️ Webhook не був встановлений');
    }
    try {
        await tempBot.stop();
    } catch (e) {}
    console.log('⏳ Зачекайте 2 секунди...');
    await new Promise(resolve => setTimeout(resolve, 2000));
}

// ------------------ ОСНОВНИЙ БОТ ------------------
async function startBot() {
    await resetBotConnections();

    const bot = new Bot(TOKEN);

    // КОМАНДИ
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
            'Просто напиши приклад, наприклад:\n' +
            '`(38+94)*73+29`\n`2+2*2`\n\n' +
            '✅ Бот працює в особистих чатах, групах та бізнес-акаунті!';
        await ctx.reply(helpText, { parse_mode: 'Markdown' });
    });
    bot.command('weather', async (ctx) => {
        await ctx.reply('⏳ Отримую погоду...');
        const weatherInfo = await getWeather();
        await ctx.reply(weatherInfo, { parse_mode: 'Markdown' });
    });

    // БІЗНЕС-ПОВІДОМЛЕННЯ
    bot.on('business_message', async (ctx) => {
        const msg = ctx.businessMessage;
        const text = msg.text;
        const from = msg.from;

        let employeeId = null;
        try {
            const conn = await ctx.getBusinessConnection();
            employeeId = conn.user.id;
        } catch (e) {}

        if (employeeId && from.id === employeeId) return;
        if (!text) return;

        if (text.startsWith('/')) {
            const command = text.split(' ')[0].toLowerCase();
            if (command === '/start') {
                await ctx.reply('👋 Вітаю! Я ваш бізнес-асистент.');
            } else if (command === '/help') {
                await ctx.reply('📋 Команди: /start, /help, /weather\n🧮 Або приклад: `2+2*2`', { parse_mode: 'Markdown' });
            } else if (command === '/weather') {
                await ctx.reply('⏳ Отримую погоду...');
                const weatherInfo = await getWeather();
                await ctx.reply(weatherInfo, { parse_mode: 'Markdown' });
            }
            return;
        }

        const hasDigits = /\d/.test(text);
        const hasOperators = /[+\-*/]/.test(text);
        if (hasDigits && hasOperators) {
            const result = calculateExpression(text);
            if (result) {
                await ctx.reply(result, { parse_mode: 'Markdown' });
            }
        }
    });

    // ЗВИЧАЙНІ ПОВІДОМЛЕННЯ
    bot.on('message:text', async (ctx) => {
        const text = ctx.message.text;
        if (text.startsWith('/')) return;
        const hasDigits = /\d/.test(text);
        const hasOperators = /[+\-*/]/.test(text);
        if (hasDigits && hasOperators) {
            const result = calculateExpression(text);
            if (result) {
                await ctx.reply(result, { parse_mode: 'Markdown' });
            }
        }
    });

    // МЕНЮ КОМАНД
    await bot.api.setMyCommands([
        { command: 'start', description: '🚀 Запустити бота' },
        { command: 'help', description: '❓ Показати список команд' },
        { command: 'weather', description: '🌡 Погода в Нововолинську' },
    ]);
    console.log('✅ Меню команд налаштовано');

    // ЗАПУСК
    bot.start({
        onStart: (botInfo) => {
            console.log(`========================================`);
            console.log(`✅ Бот @${botInfo.username} успішно запущений!`);
            console.log(`📌 Працює в особистих чатах, групах та бізнес-акаунті`);
            console.log(`🚀 Очікую повідомлення...`);
            console.log(`========================================`);
        },
    });
}

startBot().catch((err) => {
    console.error('❌ КРИТИЧНА ПОМИЛКА:', err);
    process.exit(1);
});
