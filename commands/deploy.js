const { execFile } = require("child_process");
const { promisify } = require("util");
const apps = require("../config/apps");

const execFileAsync = promisify(execFile);

let deploying = false;

module.exports = async (ctx) => {
  if (deploying) {
    return ctx.reply("⚠️ Ya existe un despliegue en proceso.");
  }

  deploying = true;

  await ctx.reply("🚀 Iniciando despliegue...");

  try {
    const { stdout, stderr } = await execFileAsync(
      "/bin/bash",
      [apps.api.deployScript],
      {
        timeout: 120000,
        maxBuffer: 1024 * 1024
      }
    );

    await ctx.reply(
      "✅ Despliegue completado\n\n" +
      (stdout || stderr || "Sin salida").slice(-3500)
    );
  } catch (error) {
    console.error(error);

    await ctx.reply(
      "❌ Error durante el despliegue.\n" +
      "Revisa los logs del bot."
    );
  } finally {
    deploying = false;
  }
};