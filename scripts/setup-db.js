/**
 * Configura el esquema en Neon y crea el admin inicial.
 * Uso:
 *   DATABASE_URL=... node scripts/setup-db.js
 *   ADMIN_PIN=1234 node scripts/setup-db.js   (opcional, default 1234)
 */
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Definí DATABASE_URL');
    process.exit(1);
  }
  const sql = neon(url);
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Quitar el INSERT fake de admin del schema (lo hacemos bien abajo)
  schema = schema.replace(/-- Admin inicial[\s\S]*$/m, '');

  // Ejecutar statements uno a uno (neon serverless no corre multi-statement siempre)
  const parts = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));

  for (const part of parts) {
    try {
      await sql(part);
    } catch (e) {
      // ignorar "already exists"
      if (!/already exists/i.test(e.message)) {
        console.warn('Aviso:', e.message, '\n→', part.slice(0, 80));
      }
    }
  }

  const pin = process.env.ADMIN_PIN || '1234';
  const hash = await bcrypt.hash(pin, 10);

  const existing = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (existing.length) {
    await sql`UPDATE users SET pin_hash = ${hash}, name = 'Admin' WHERE id = ${existing[0].id}`;
    console.log('Admin actualizado. PIN:', pin);
  } else {
    await sql`
      INSERT INTO users (name, role, pin_hash)
      VALUES ('Admin', 'admin', ${hash})
    `;
    console.log('Admin creado. PIN:', pin);
  }

  console.log('Listo. Cambiá el PIN desde el panel Ajustes después del primer login.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
