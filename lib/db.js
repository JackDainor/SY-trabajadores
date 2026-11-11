import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Falta DATABASE_URL. Configura la variable de entorno de Neon.');
  }
  return neon(url);
}

export async function getSetting(key, fallback = null) {
  const sql = getSql();
  const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return rows[0]?.value ?? fallback;
}

export async function getPrices() {
  const sql = getSql();
  const rows = await sql`SELECT key, value FROM settings WHERE key LIKE 'precio_%'`;
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return {
    prenda: map.precio_prenda ?? 1.4,
    recta: map.precio_recta ?? 1.0,
    over: map.precio_over ?? 0.4,
  };
}
