
const {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
} = require("@aws-sdk/client-ssm");

const crypto = require("node:crypto");

const ssm = new SSMClient({ region: "us-east-1" });

const INSTANCE_ID = "i-050ba223a7a545362";
const DOCUMENT_NAME = "RestartOdooProduction";

const CONFIRMATION_TIMEOUT = 2 * 60 * 1000;

// Códigos pendientes por usuario y chat
const pendingConfirmations = new Map();

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function registerOdooCommands(bot) {
  const authorizedUserId = String(process.env.TELEGRAM_USER_ID || "");

  function isAuthorized(ctx) {
    return (
      authorizedUserId &&
      String(ctx.from?.id) === authorizedUserId
    );
  }

  // Solicitar reinicio
  bot.command("odoo_restart", async (ctx) => {
    if (!isAuthorized(ctx)) {
      return ctx.reply("⛔ No autorizado.");
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const key = `${ctx.chat.id}:${ctx.from.id}`;

    pendingConfirmations.set(key, {
      code,
      expiresAt: Date.now() + CONFIRMATION_TIMEOUT,
    });

    await ctx.reply(
      "⚠️ REINICIO DE ODOO EN PRODUCCIÓN\n\n" +
      "Contenedor: odoo-app-prod\n" +
      "Instancia: odoo-prod-server\n\n" +
      `Código: ${code}\n\n` +
      `Para confirmar escribe:\n/odoo_confirmar ${code}\n\n` +
      "⏱️ El código caduca en 2 minutos."
    );
  });

  // Confirmar reinicio
  bot.command("odoo_confirmar", async (ctx) => {
    if (!isAuthorized(ctx)) {
      return ctx.reply("⛔ No autorizado.");
    }

    const key = `${ctx.chat.id}:${ctx.from.id}`;
    const pending = pendingConfirmations.get(key);

    if (!pending) {
      return ctx.reply(
        "No hay reinicios pendientes. Usa /odoo_restart."
      );
    }

    if (Date.now() > pending.expiresAt) {
      pendingConfirmations.delete(key);
      return ctx.reply(
        "⏱️ El código expiró. Usa /odoo_restart nuevamente."
      );
    }

    const receivedCode = String(ctx.message?.text || "")
      .trim()
      .split(/\s+/)[1];

    if (receivedCode !== pending.code) {
      return ctx.reply("❌ Código incorrecto.");
    }

    // Consumir el código antes de cualquier operación asíncrona.
    pendingConfirmations.delete(key);

    await ctx.reply(
      "🔄 Enviando reinicio de Odoo a AWS Systems Manager..."
    );

    let commandId;

    try {
      const response = await ssm.send(
        new SendCommandCommand({
          InstanceIds: [INSTANCE_ID],
          DocumentName: DOCUMENT_NAME,
          Comment: "Reinicio solicitado desde Telegram",
        })
      );

      commandId = response.Command?.CommandId;

      if (!commandId) {
        throw new Error("AWS no devolvió un CommandId");
      }

      await ctx.reply(
        `✅ Orden enviada a AWS.\nCommandId: ${commandId}\n\nEsperando resultado...`
      );

      // Consultar el resultado durante un máximo de 3 minutos.
      for (let attempt = 0; attempt < 36; attempt++) {
        await sleep(5000);

        let result;

        try {
          result = await ssm.send(
            new GetCommandInvocationCommand({
              CommandId: commandId,
              InstanceId: INSTANCE_ID,
            })
          );
        } catch (error) {
          // Puede tardar unos segundos en aparecer la ejecución.
          if (error.name === "InvocationDoesNotExist") {
            continue;
          }
          throw error;
        }

        if (
          result.Status === "Pending" ||
          result.Status === "InProgress" ||
          result.Status === "Delayed"
        ) {
          continue;
        }

        if (result.Status === "Success") {
          const healthy = (result.StandardOutputContent || "")
            .includes("ODOO_HEALTHY");

          return ctx.reply(
            healthy
              ? "✅ ODOO REINICIADO CORRECTAMENTE\n\n" +
                "Contenedor: odoo-app-prod\n" +
                "Estado: HEALTHY\n" +
                `CommandId: ${commandId}`
              : "⚠️ El documento SSM terminó correctamente, " +
                "pero no se encontró ODOO_HEALTHY.\n" +
                `CommandId: ${commandId}`
          );
        }

        return ctx.reply(
          "❌ Error al reiniciar Odoo.\n" +
          `Estado: ${result.Status}\n` +
          `Error: ${(result.StandardErrorContent || "Sin detalle").slice(0, 1500)}\n` +
          `CommandId: ${commandId}`
        );
      }

      return ctx.reply(
        "⏱️ No se recibió el resultado dentro de 3 minutos.\n" +
        "El reinicio podría seguir ejecutándose.\n" +
        `CommandId: ${commandId}`
      );
    } catch (error) {
      console.error("Error SSM Odoo:", error);

      return ctx.reply(
        "❌ No se pudo completar la operación SSM.\n" +
        `Detalle: ${error.message}\n` +
        (commandId ? `CommandId: ${commandId}` : "")
      );
    }
  });
}

module.exports = { registerOdooCommands };
