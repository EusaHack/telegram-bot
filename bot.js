require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(
  process.env.TELEGRAM_TOKEN,
  { polling: true }
);

bot.onText(/^\/start$/, (msg) => {
  if (String(msg.from.id) !== process.env.TELEGRAM_USER_ID) {
    return;
  }

  bot.sendMessage(
    msg.chat.id,
    "✅ Conexión exitosa con tu servidor Ubuntu."
  );
});

console.log("Bot de Telegram conectado.");