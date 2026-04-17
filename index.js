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

// ======================= ОСНОВНІ ОБРОБНИКИ =======================

// 1. ОБРОБНИКИ ДЛЯ ЗВИЧАЙНИХ КОМАНД (для особистих чатів та груп)
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


// 2. ОБРОБНИК ДЛЯ БІЗНЕС-ПОВІДОМЛЕНЬ (ГОЛОВНЕ)
// Тут ми додаємо обробку команд для бізнес-чату
bot.on('business_message', async (ctx) => {
    const msg = ctx.businessMessage;
    const text = msg.text;
    const from = msg.from;

    // Отримуємо інформацію про бізнес-з'єднання, щоб дізнатися ID вашого акаунту
    const conn = await ctx.getBusinessConnection();
    const employeeId = conn.user.id;

    // Ігноруємо повідомлення, які ви (власник бізнес-акаунта) надіслали самі
    if (from.id === employeeId) {
        return;
    }

    // Якщо повідомлення не є текстовим, ігноруємо
    if (!text) return;

    // --- ЛОГІКА ОБРОБКИ КОМАНД ---
    if (text.startsWith('/')) {
        const command = text.split(' ')[0].toLowerCase(); // Отримуємо команду, наприклад '/weather'
        
        // Обробка /start
        if (command === '/start') {
            await ctx.reply('👋 Вітаю! Я ваш бізнес-асистент. Напишіть /help, щоб дізнатися, що я вмію.');
        }
        // Обробка /help
        else if (command === '/help') {
            const helpText = 
                '📋 *Команди вашого бізнес-асистента:*\n\n' +
                '/start - Запустити асистента\n' +
                '/help - Показати це повідомлення\n' +
                '/weather - Погода в Нововолинську\n\n' +
                '🧮 *Або просто надішліть математичний приклад, наприклад:* `(38+94)*73+29`';
            await ctx.reply(helpText, { parse_mode: 'Markdown' });
        }
        // Обробка /weather
        else if (command === '/weather') {
            await ctx.reply('⏳ Отримую погоду для Нововолинська...');
            const weatherInfo = await getWeather();
            await ctx.reply(weatherInfo, { parse_mode: 'Markdown' });
        }
    } 
    // --- ЛОГІКА КАЛЬКУЛЯТОРА ДЛЯ ЗВИЧАЙНИХ ПОВІДОМЛЕНЬ ---
    else {
        const hasDigits = /\d/.test(text);
        const hasOperators = /[+\-*/]/.test(text);
        if (hasDigits && hasOperators) {
            const result = calculateExpression(text);
            if (result) {
                await ctx.reply(result, { parse_mode: 'Markdown' });
            }
        }
    }
});

// 3. ОБРОБНИК ДЛЯ ЗВИЧАЙНИХ ПОВІДОМЛЕНЬ (для калькулятора в особистому чаті)
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

// ======================= НАЛАШТУВАННЯ МЕНЮ КОМАНД ПРИ ЗАПУСКУ =======================
async function setupCommands() {
    const commandsList = [
        { command: 'start', description: '🚀 Запустити бота' },
        { command: 'help', description: '❓ Показати список команд' },
        { command: 'weather', description: '🌡 Погода в Нововолинську' },
    ];
    // Цей рядок відповідає за появу підказок під час введення '/'
    await bot.api.setMyCommands(commandsList);
    console.log('✅ Меню команд успішно налаштовано!');
}

// ======================= ЗАПУСК БОТА =======================
bot.start({
    onStart: async (botInfo) => {
        console.log(`✅ Бот @${botInfo.username} успішно запущений!`);
        console.log(`📌 Бот працює в особистих чатах та бізнес-акаунті`);
        await setupCommands(); // Викликаємо функцію для налаштування меню
        console.log(`🚀 Бот готовий та чекає на повідомлення...`);
    },
});bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Бот @${botInfo.username} запущений!`);
        console.log(`📌 Працює в особистих чатах, групах та бізнес-акаунті`);
        console.log(`🚀 Очікую повідомлення...`);
    },
});
