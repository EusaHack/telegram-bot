require("dotenv").config();

const { Bot } = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_TOKEN;
const USER_ID = String(process.env.TELEGRAM_USER_ID);

if (!TOKEN || !process.env.TELEGRAM_USER_ID) {
  throw new Error("Faltan variables de entorno");
}

const bot = new Bot(TOKEN);

// Middleware de seguridad
bot.use(async (ctx, next) => {
  const userId = String(ctx.from?.id ?? "");
  const chatType = ctx.chat?.type;

  if (userId !== USER_ID || chatType !== "private") {
    console.log("Acceso no autorizado:", userId);
    return;
  }

  await next();
});

// Comando /start
bot.command("start", async (ctx) => {
  await ctx.reply(
    "🤖 Administrador de servidor activo.\n\n" +
    "Comandos disponibles:\n" +
    "/start - Iniciar bot\n" +
    "/status - Estado del bot\n" +
    "/help - Mostrar ayuda"
  );
});

// Comando /status
bot.command("status", async (ctx) => {
  const uptime = Math.floor(process.uptime());

  await ctx.reply(
    "✅ Bot funcionando correctamente\n" +
    `⏱ Tiempo activo: ${uptime} segundos\n` +
    `🟢 Node.js: ${process.version}`
  );
});

// Comando /help
bot.command("help", async (ctx) => {
  await ctx.reply(
    "📋 Comandos disponibles:\n\n" +
    "/start\n" +
    "/status\n" +
    "/help"
  );
});

// Manejo de errores
bot.catch((error) => {
  console.error("Error del bot:", error);
});

// Iniciar long polling
console.log("Iniciando bot de Telegram v2...");

bot.startPolling().catch((error) => {
  console.error("Error de polling:", error);
  process.exitCode = 1;
});