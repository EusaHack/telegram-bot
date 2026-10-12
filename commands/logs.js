const { execFile } = require("child_process");
const { promisify } = require("util");
const apps = require("../config/apps");

const execFileAsync = promisify(execFile);

module.exports = async (ctx) => {
  const app = apps.api;

  try {
    const { stdout, stderr } = await execFileAsync(
      "pm2",
      [
        "logs",
        app.pm2Name,
        "--lines",
        "30",
        "--nostream",
        "--raw"
      ],
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      }
    );

    const output = (stdout + "\n" + stderr).trim();

    await ctx.reply(
      `📄 LOGS: ${app.pm2Name}\n\n` +
      (output || "Sin registros recientes").slice(-3500)
    );
  } catch (error) {
    console.error(error);
    await ctx.reply("❌ No se pudieron obtener los logs.");
  }
};