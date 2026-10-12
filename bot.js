require("dotenv").config();

const { Bot } = require("node-telegram-bot-api");

const serverCommand = require("./commands/server");
const pm2Command = require("./commands/pm2");
const logsCommand = require("./commands/logs");
const deployCommand = require("./commands/deploy");
const {
  citaCommand,
  confirmarCita
} = require("./commands/cita");

const TOKEN = process.env.TELEGRAM_TOKEN;
const USER_ID = String(process.env.TELEGRAM_USER_ID);

if (!TOKEN || !process.env.TELEGRAM_USER_ID) {
  throw new Error("Faltan variables de entorno");
}

const bot = new Bot(TOKEN);

// Seguridad: solo tu usuario y chat privado
bot.use(async (ctx, next) => {
  if (
    String(ctx.from?.id) !== USER_ID ||
    ctx.chat?.type !== "private"
  ) {
    return;
  }

  await next();
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    "🤖 ADMINISTRADOR VPS\n\n" +
    "🖥 /server - Estado del servidor\n" +
    "📦 /pm2 - Procesos PM2\n" +
    "📄 /logs - Logs de la aplicación\n" +
    "🚀 /deploy - Actualizar aplicación\n" +
    "📅 /cita [ID] [ESTADO] - Cambiar estado de una cita\n" +
    "📋 /help - Ayuda"
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "📋 COMANDOS DISPONIBLES\n\n" +
    "/server\n" +
    "/pm2\n" +
    "/logs\n" +
    "/deploy" +
    "/cita [ID] [ESTADO]\n"
  );
});

bot.command("server", serverCommand);
bot.command("pm2", pm2Command);
bot.command("logs", logsCommand);
bot.command("deploy", deployCommand);
bot.command("cita", citaCommand);
bot.command("confirmarcita", confirmarCita);

bot.catch((error) => {
  console.error("Error del bot:", error);
});

console.log("🤖 Bot administrador iniciado");

bot.startPolling().catch((error) => {
  console.error("Error de polling:", error);
  process.exitCode = 1;
});