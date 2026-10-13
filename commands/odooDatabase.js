
const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

const rdsCA = fs.readFileSync(
  path.join(__dirname, "../certs/rds-global-bundle.pem"),
  "utf8"
);

async function consultarFechaOdoo(ctx) {
  const client = new Client({
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

module.exports = { consultarFechaOdoo };
