
const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const rdsCA = fs.readFileSync(
  path.join(__dirname, "../certs/rds-global-bundle.pem"),
  "utf8"
);

// Función reutilizable para conectarse a PostgreSQL
function crearClientePostgres() {
  return new Client({
    host: process.env.ODOO_DB_HOST,
    port: 5432,
    user: process.env.ODOO_DB_USER,
    password: process.env.ODOO_DB_PASSWORD,
    database: process.env.ODOO_DB_NAME,

    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,

    ssl: {
      ca: rdsCA,
      rejectUnauthorized: true
    }
  });
}


async function consultarFechaOdoo(ctx) {

  const client = crearClientePostgres();

  try {
    await ctx.reply("🔎 Consultando PostgreSQL de Odoo...");

    await client.connect();

    const result = await client.query(
      `SELECT key, value
       FROM ir_config_parameter
       WHERE key = $1`,
      ["database.expiration_date"]
    );

    if (result.rows.length === 0) {
      return ctx.reply(
        "⚠️ El parámetro database.expiration_date no existe."
      );
    }

    await ctx.reply(
      "🐘 POSTGRESQL ODOO\n\n" +
      `Base de datos: ${process.env.ODOO_DB_NAME}\n` +
      `Parámetro: ${result.rows[0].key}\n` +
      `Valor actual: ${result.rows[0].value}`
    );

  } catch (error) {
    console.error("Error PostgreSQL:", error);

    await ctx.reply(
      "❌ No fue posible consultar PostgreSQL.\n" +
      "Revisa los logs del bot para más detalles."
    );
  } finally {
    await client.end().catch(() => {});
  }
}


const cambiosPendientes = new Map();

async function solicitarUpdate(ctx) {
  const fecha = ctx.message.text.trim().split(/\s+/)[1];

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return ctx.reply(
      "Uso: /odoo_update_fecha AAAA-MM-DD"
    );
  }

  const codigo = crypto.randomInt(100000, 1000000).toString();
  const clave = `${ctx.chat.id}:${ctx.from.id}`;

  cambiosPendientes.set(clave, {
    codigo,
    fecha,
    expira: Date.now() + 120000
  });

  await ctx.reply(
    "⚠️ CONFIRMAR ACTUALIZACIÓN\n\n" +
    "Base de datos: FarinaActual\n" +
    "Parámetro: mi_erp.fecha_prueba\n" +
    `Nuevo valor: ${fecha}\n\n` +
    `Confirma con:\n/odoo_update_confirmar ${codigo}\n\n` +
    "El código caduca en 2 minutos."
  );
}

async function confirmarUpdate(ctx) {

  const clave = `${ctx.chat.id}:${ctx.from.id}`;
  const pendiente = cambiosPendientes.get(clave);
  const codigo = ctx.message.text.trim().split(/\s+/)[1];

  if (!pendiente || Date.now() > pendiente.expira) {
    cambiosPendientes.delete(clave);
    return ctx.reply("No hay actualización pendiente o ha expirado.");
  }

  if (codigo !== pendiente.codigo) {
    return ctx.reply("Código incorrecto.");
  }

  cambiosPendientes.delete(clave);

  const client = crearClientePostgres();

  try {
    await client.connect();

    const resultado = await client.query(
      `UPDATE ir_config_parameter
       SET value = $1
       WHERE key = $2
       RETURNING key, value`,
      [pendiente.fecha, "database.expiration_date"]
    );

    if (resultado.rowCount === 0) {
      return ctx.reply(
        "No se encontró el parámetro. No se modificaron registros."
      );
    }

    await ctx.reply(
      "✅ ACTUALIZACIÓN EXITOSA\n\n" +
      `Parámetro: ${resultado.rows[0].key}\n` +
      `Nuevo valor: ${resultado.rows[0].value}`
    );
  } catch (error) {
    console.error("Error UPDATE PostgreSQL:", error);
    await ctx.reply("❌ Error al actualizar PostgreSQL.");
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = { consultarFechaOdoo, solicitarUpdate, confirmarUpdate };
