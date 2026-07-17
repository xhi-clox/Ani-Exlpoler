import pg from "pg";
import { logger } from "../lib/logger";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let noDbMode = false;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!DATABASE_URL) {
      noDbMode = true;
      logger.warn("DATABASE_URL not set — app running in no-database mode");
      pool = new Pool();
      return pool;
    }
    pool = new Pool({ connectionString: DATABASE_URL });
    pool.on("error", (err) => {
      logger.error(err, "Unexpected database pool error");
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  const start = Date.now();
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      logger.debug({ text: text.slice(0, 80), duration, rows: result.rowCount }, "db query");
      return result;
    } finally {
      client.release();
    }
  } catch (err) {
    if (noDbMode) {
      logger.warn({ text: text.slice(0, 80) }, "No database available — skipping query");
      return { rows: [], rowCount: 0, command: "", oid: 0, fields: [] } as pg.QueryResult;
    }
    throw err;
  }
}
