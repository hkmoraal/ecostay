import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Managed Postgres (Render, Supabase, ...) usually requires TLS. Set DB_SSL=true.
const useSsl = /^(1|true|yes)$/i.test(process.env.DB_SSL || '');
const ssl = useSsl ? { rejectUnauthorized: false } : undefined;

// Two ways to configure the connection:
//  - DATABASE_URL  (one connection string, e.g. Render's Internal Database URL)
//  - DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME  (separate parts, for local/VPS)
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl, max: Number(process.env.DB_POOL || 10) }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'ecostay',
        password: process.env.DB_PASSWORD || 'ecostay',
        database: process.env.DB_NAME || 'ecostay',
        ssl,
        max: Number(process.env.DB_POOL || 10),
      }
);

// Let routes keep readable :named placeholders; translate to $1.. for pg.
function toPositional(sql, params) {
  if (!params || Array.isArray(params)) return { text: sql, values: params || [] };
  const order = [];
  const text = sql.replace(/:([a-zA-Z_]\w*)/g, (_, name) => {
    let idx = order.indexOf(name);
    if (idx === -1) { order.push(name); idx = order.length - 1; }
    return '$' + (idx + 1);
  });
  return { text, values: order.map((n) => params[n]) };
}

// Returns the rows array directly (like the old MySQL helper).
export async function query(sql, params) {
  const { text, values } = toPositional(sql, params);
  const res = await pool.query(text, values);
  return res.rows;
}

// Run several statements in one transaction. The callback gets a `q` helper
// with the same :named-placeholder support.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = async (sql, params) => {
      const { text, values } = toPositional(sql, params);
      return (await client.query(text, values)).rows;
    };
    const result = await fn(q);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Retry until Postgres accepts connections (fresh container needs a moment).
export async function waitForDb(retries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Database nog niet bereikbaar (poging ${attempt}/${retries})…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
