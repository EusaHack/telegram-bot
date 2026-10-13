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

const {
  ec2Status,
  ec2Restart,
  ec2Confirmar
} = require("./commands/ec2");
const { registerOdooCommands } = require("./commands/odoo");


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

    "🖥 SERVIDOR\n" +
    "/server - Estado del servidor\n" +
    "/pm2 - Consultar procesos PM2\n" +
    "/logs - Ver logs de la aplicación\n" +
    "/deploy - Actualizar aplicación\n\n" +

    "📅 CITAS\n" +
    "/cita [ID] [ESTADO] - Cambiar estado de cita\n" +
    "/confirmarcita TOKEN - Confirmar cambio de cita\n\n" +

    "☁️ AWS EC2\n" +
    "/ec2_status - Consultar estado de EC2\n" +
    "/ec2_restart - Solicitar reinicio de EC2\n" +
    "/ec2_confirmar CODIGO - Confirmar reinicio EC2\n\n" +

    "🐳 ODOO\n" +
    "/odoo_restart - Reiniciar contenedor Docker Odoo\n" +
    "/odoo_confirmar CODIGO - Confirmar reinicio Odoo\n\n" +

    "📋 /help - Ver todos los comandos"
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "📋 COMANDOS DISPONIBLES\n\n" +

    "🖥 ADMINISTRACIÓN DEL SERVIDOR\n\n" +
    "🖥 /server\n" +
    "Consultar CPU, RAM y disco del servidor.\n\n" +

    "📦 /pm2\n" +
    "Consultar procesos administrados por PM2.\n\n" +

    "📄 /logs\n" +
    "Consultar logs de la aplicación.\n\n" +

    "🚀 /deploy\n" +
    "Actualizar y desplegar la aplicación.\n\n" +

    "📅 ADMINISTRACIÓN DE CITAS\n\n" +
    "📝 /cita [ID] [ESTADO]\n" +
    "Solicitar cambio de estado de una cita.\n\n" +

    "🔐 /confirmarcita TOKEN\n" +
    "Confirmar el cambio de estado.\n\n" +

    "☁️ ADMINISTRACIÓN AWS EC2\n\n" +
    "🔎 /ec2_status\n" +
    "Consultar el estado de la instancia EC2.\n\n" +

    "🔄 /ec2_restart\n" +
    "Solicitar reinicio completo de la instancia EC2.\n\n" +

    "🔐 /ec2_confirmar CODIGO\n" +
    "Confirmar el reinicio de la instancia EC2.\n\n" +

    "🐳 ADMINISTRACIÓN ODOO\n\n" +
    "♻️ /odoo_restart\n" +
    "Solicitar reinicio del contenedor odoo-app-prod.\n\n" +

    "🔐 /odoo_confirmar CODIGO\n" +
    "Confirmar reinicio del contenedor Odoo.\n\n" +

    "⚠️ Los reinicios requieren confirmación."
  );
});


bot.command("server", serverCommand);
bot.command("pm2", pm2Command);
bot.command("logs", logsCommand);
bot.command("deploy", deployCommand);
bot.command("cita", citaCommand);
bot.command("confirmarcita", confirmarCita);
bot.command("ec2_status", ec2Status);
bot.command("ec2_restart", ec2Restart);
bot.command("ec2_confirmar", ec2Confirmar);
registerOdooCommands(bot);

bot.catch((error) => {
  console.error("Error del bot:", error);
});

console.log("🤖 Bot administrador iniciado");

bot.startPolling().catch((error) => {
  console.error("Error de polling:", error);
  process.exitCode = 1;
});