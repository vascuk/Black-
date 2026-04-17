const { Bot } = require('grammy');
const axios = require('axios');

const TOKEN = '8498488320:AAFR7V3Da-4Hp6oG_COKQBKommNBnGA43y4';

async function startBot() {
    // Скидаємо webhook перед запуском (це вирішує 90% проблем)
    const tempBot = new Bot(TOKEN);
    try {
        await tempBot.api.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook видалено');
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));

    const bot = new Bot(TOKEN);

    // Калькулятор
    function calc(expr) {
        let e = expr.trim().replace(/=$/, '').replace(/\s/g, '');
        if (!/^[0-9+\-*/().]+$/.test(e)) return null;
        try {
            let r = Function('"use strict";return (' + e + ')')();
            r = Math.round(r * 100000) / 100000;
            return `📝 ${e} = ${r}`;
        } catch { return null; }
    }

    // Погода
    async function weather() {
        try {
            const res = await axios.get('https://wttr.in/Novovolynsk?format=%C+%t+%w&lang=uk', { timeout: 10000 });
            return `🌡 Погода в Нововолинську: ${res.data.trim()}`;
        } catch { return '⚠️ Помилка погоди'; }
    }

    // Команди (працюють в особистих чатах)
    bot.command('start', async (ctx) => {
        await ctx.reply('👋 Привіт! Я бот. Напиши /help');
    });
    bot.command('help', async (ctx) => {
        await ctx.reply('📋 Команди: /start, /help, /weather\nКалькулятор: напиши приклад, наприклад 2+2*2');
    });
    bot.command('weather', async (ctx) => {
        await ctx.reply('⏳ Отримую...');
        await ctx.reply(await weather());
    });

    // Калькулятор на будь-яке текстове повідомлення (в особистих чатах)
    bot.on('message:text', async (ctx) => {
        const text = ctx.message.text;
        if (text.startsWith('/')) return;
        const res = calc(text);
        if (res) await ctx.reply(res);
    });

    // Меню команд
    await bot.api.setMyCommands([
        { command: 'start', description: 'Запустити' },
        { command: 'help', description: 'Допомога' },
        { command: 'weather', description: 'Погода' },
    ]);

    // Запуск polling
    bot.start({
        onStart: () => {
            console.log('✅ Бот успішно запущений!');
            console.log('📌 Працює в особистих чатах (напишіть /start)');
        },
    });
}

startBot().catch(console.error);
