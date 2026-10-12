
const { execFile } = require("child_process");
const crypto = require("crypto");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const INSTANCE_ID = "i-050ba223a7a545362";
const REGION = "us-east-1";
const INSTANCE_NAME = "odoo-prod-server";

const confirmaciones = new Map();
let reiniciando = false;

async function ejecutarAWS(args) {
  return execFileAsync("aws", args, {
    timeout: 30000,
    maxBuffer: 1024 * 1024
  });
}

// Consultar estado
async function ec2Status(ctx) {
  try {
    const { stdout } = await ejecutarAWS([
      "ec2",
      "describe-instances",
      "--instance-ids", INSTANCE_ID,
      "--region", REGION,
      "--query",
      "Reservations[].Instances[].State.Name",
      "--output", "text"
    ]);

    await ctx.reply(
      "🖥 ESTADO EC2\n\n" +
      `Servidor: ${INSTANCE_NAME}\n` +
      `ID: ${INSTANCE_ID}\n` +
      `Región: ${REGION}\n` +
      `Estado: ${stdout.trim()}`
    );
  } catch (error) {
    console.error("Error EC2 status:", error.message);
    await ctx.reply("❌ No se pudo consultar la instancia.");
  }
}

// Solicitar reinicio
async function ec2Restart(ctx) {
  if (reiniciando) {
    return ctx.reply("⚠️ Ya hay un reinicio en proceso.");
  }

  const userId = String(ctx.from.id);
  const token = crypto.randomBytes(12).toString("hex");

  confirmaciones.set(userId, {
    token,
    expires: Date.now() + 60000
  });

  await ctx.reply(
    "⚠️ CONFIRMAR REINICIO EC2\n\n" +
    `Servidor: ${INSTANCE_NAME}\n` +
    `ID: ${INSTANCE_ID}\n\n` +
    "Esta acción reiniciará el servidor y " +
    "puede interrumpir Odoo temporalmente.\n\n" +
    "Para confirmar envía:\n" +
    `/ec2_confirmar ${token}\n\n` +
    "⏱ Válido durante 60 segundos."
  );
}

// Confirmar y ejecutar
async function ec2Confirmar(ctx) {
  const userId = String(ctx.from.id);
  const partes = (ctx.message?.text || "")
    .trim().split(/\s+/);

  const pendiente = confirmaciones.get(userId);

  if (!pendiente || partes[1] !== pendiente.token) {
    return ctx.reply("❌ Confirmación inválida.");
  }

  confirmaciones.delete(userId);

  if (Date.now() > pendiente.expires) {
    return ctx.reply("⌛ La confirmación expiró.");
  }

  if (reiniciando) {
    return ctx.reply("⚠️ Ya hay un reinicio en proceso.");
  }

  reiniciando = true;

  try {
    await ctx.reply("🔄 Solicitando reinicio a AWS...");

    await ejecutarAWS([
      "ec2",
      "reboot-instances",
      "--instance-ids", INSTANCE_ID,
      "--region", REGION
    ]);

    await ctx.reply(
      "✅ SOLICITUD DE REINICIO ENVIADA\n\n" +
      `Servidor: ${INSTANCE_NAME}\n` +
      `ID: ${INSTANCE_ID}\n\n` +
      "AWS aceptó la solicitud.\n" +
      "El reinicio puede tardar unos minutos.\n\n" +
      "Usa /ec2_status para consultar su estado."
    );
  } catch (error) {
    console.error("Error reiniciando EC2:", error.message);

    await ctx.reply(
      "❌ No se pudo confirmar el reinicio.\n" +
      "Revisa los logs del bot y el estado en AWS."
    );
  } finally {
    reiniciando = false;
  }
}

module.exports = {
  ec2Status,
  ec2Restart,
  ec2Confirmar
};