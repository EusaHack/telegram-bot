const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function formatBytes(bytes) {
  return (bytes / 1024 ** 3).toFixed(2) + " GB";
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

module.exports = async (ctx) => {
  try {
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    const { stdout } = await execFileAsync(
      "df",
      ["-h", "/"],
      { timeout: 5000 }
    );

    const disk = stdout.trim().split("\n")[1];

    const cpu = os.cpus();
    const load = os.loadavg()[0];

    await ctx.reply(
      "🖥 ESTADO DEL SERVIDOR\n\n" +
      `💻 Host: ${os.hostname()}\n` +
      `🧠 CPU: ${cpu.length} núcleos\n` +
      `📊 Carga promedio (1 min): ${load.toFixed(2)}\n\n` +
      `💾 RAM usada: ${formatBytes(usedRam)}\n` +
      `💾 RAM total: ${formatBytes(totalRam)}\n\n` +
      `💽 Disco raíz:\n${disk}\n\n` +
      `⏱ Uptime: ${formatUptime(os.uptime())}`
    );
  } catch (error) {
    console.error(error);
    await ctx.reply("❌ No se pudo consultar el servidor.");
  }
};