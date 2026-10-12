
const { execFile } = require("child_process");
const path = require("path");
const crypto = require("crypto");

const SCRIPT = path.resolve(
  __dirname,
  "../scripts/cambiar_cita.py"
);

const ESTADOS_PERMITIDOS = new Set(["pending"]);
const pendientes = new Map();
const enEjecucion = new Set();

function ejecutarPython(id, estado) {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      [SCRIPT, String(id), estado],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env
        }
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Python:", stderr || error.message);
          return reject(new Error("Falló la ejecución de Python"));
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          reject(new Error("Respuesta inválida de Python"));
        }
      }
    );
  });
}

async function citaCommand(ctx) {
  const texto = ctx.message?.text || "";
  const partes = texto.trim().split(/\s+/);

  if (partes.length !== 3) {
    return ctx.reply(
      "Uso correcto:\n/cita 23273 pending"
    );
  }

  const idTexto = partes[1];
  const estado = partes[2].toLowerCase();

  if (!/^[1-9]\d*$/.test(idTexto)) {
    return ctx.reply("❌ ID de cita inválido.");
  }

  const id = Number(idTexto);

  if (!Number.isSafeInteger(id)) {
    return ctx.reply("❌ ID fuera de rango.");
  }

  if (!ESTADOS_PERMITIDOS.has(estado)) {
    return ctx.reply("❌ Estado no permitido.");
  }

  const userId = String(ctx.from.id);

  if (enEjecucion.has(userId)) {
    return ctx.reply("⚠️ Ya tienes una operación en ejecución.");
  }

  const token = crypto.randomBytes(12).toString("hex");

  pendientes.set(userId, {
    token,
    id,
    estado,
    expires: Date.now() + 60000
  });

  await ctx.reply(
    `⚠️ CONFIRMAR CAMBIO DE CITA\n\n` +
    `Cita: ${id}\n` +
    `Nuevo estado: ${estado}\n\n` +
    `Para confirmar, envía:\n` +
    `/confirmarcita ${token}\n\n` +
    `La confirmación vence en 60 segundos.`
  );
}

async function confirmarCita(ctx) {
  const userId = String(ctx.from.id);
  const partes = (ctx.message?.text || "").trim().split(/\s+/);
  const operacion = pendientes.get(userId);

  if (!operacion || partes[1] !== operacion.token) {
    return ctx.reply("❌ Confirmación inválida.");
  }

  pendientes.delete(userId);

  if (Date.now() > operacion.expires) {
    return ctx.reply("⌛ Confirmación expirada.");
  }

  if (enEjecucion.has(userId)) {
    return ctx.reply("⚠️ Operación en ejecución.");
  }

  enEjecucion.add(userId);

  try {
    await ctx.reply(
      `⏳ Actualizando cita ${operacion.id}...`
    );

    const resultado = await ejecutarPython(
      operacion.id,
      operacion.estado
    );

    if (!resultado.ok) {
      return ctx.reply(`❌ ${resultado.mensaje}`);
    }

    await ctx.reply(
      `✅ ${resultado.mensaje}\n\n` +
      `📋 Cita: ${resultado.id_cita}\n` +
      `Estado anterior: ${resultado.estado_anterior}\n` +
      `Estado nuevo: ${resultado.estado_nuevo}`
    );

  } catch (error) {
    console.error(error);
    await ctx.reply(
      "❌ No se pudo completar la operación. " +
      "Consulta el estado de la cita en Odoo antes de reintentar."
    );
  } finally {
    enEjecucion.delete(userId);
  }
}

module.exports = {
  citaCommand,
  confirmarCita
};
