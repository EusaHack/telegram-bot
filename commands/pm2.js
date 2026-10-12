const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

module.exports = async (ctx) => {
  try {
    const { stdout } = await execFileAsync(
      "pm2",
      ["jlist"],
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      }
    );

    const processes = JSON.parse(stdout);

    if (!processes.length) {
      return ctx.reply("No hay procesos registrados en PM2.");
    }

    const lines = processes.map((p) => {
      const status = p.pm2_env?.status || "desconocido";
      const memory = ((p.monit?.memory || 0) / 1024 ** 2).toFixed(1);

      return (
        `📦 ${p.name}\n` +
        `Estado: ${status}\n` +
        `CPU: ${p.monit?.cpu ?? 0}%\n` +
        `RAM: ${memory} MB`
      );
    });

    await ctx.reply(
      "📋 PROCESOS PM2\n\n" + lines.join("\n\n")
    );
  } catch (error) {
    console.error(error);
    await ctx.reply("❌ No se pudieron consultar los procesos PM2.");
  }
};