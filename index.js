const TelegramBot = require('node-telegram-bot-api');

// НОВИЙ ТОКЕН
const TOKEN = '8498488320:AAF6NavsysnUgVBmLFnPXFhF3zQbXHVoFQo';

console.log('🚀 Запуск тестового бота...');

// Створюємо бота
const bot = new TelegramBot(TOKEN, { polling: true });

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(`Отримано /start від ${msg.from.first_name}`);
    bot.sendMessage(chatId, '✅ Бот працює! Вітаю!');
});

// Команда /test
bot.onText(/\/test/, (msg) => {
    const chatId = msg.chat.id;
    console.log(`Отримано /test`);
    bot.sendMessage(chatId, '🎉 Тест пройдено успішно!');
});

// Відповідь на будь-яке повідомлення (луна)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Ігноруємо команди
    if (text && text.startsWith('/')) return;
    
    console.log(`Отримано повідомлення: "${text}" від ${msg.from.first_name}`);
    bot.sendMessage(chatId, `Ви написали: "${text}"`);
});

// Перевірка, що бот запустився
bot.getMe().then((botInfo) => {
    console.log(`✅ Бот @${botInfo.username} успішно запущений!`);
    console.log(`📌 Напишіть боту /start або будь-яке повідомлення`);
});

// Помилки
bot.on('polling_error', (error) => {
    console.error('Помилка polling:', error.message);
});

console.log('🚀 Бот чекає на повідомлення...');
