import { Pool, QueryResult, QueryResultRow } from "pg";
import { ensureSshTunnel } from "./sshTunnel";

declare global {
  var __pgPool__: Pool | undefined;
}

async function createPool(): Promise<Pool> {
  const port = await ensureSshTunnel();
  return new Pool({
    host: "127.0.0.1",
    port,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: false, // usually localhost to SSH; set true only if your DB expects SSL on 127.0.0.1
  });
}

export async function getPool(): Promise<Pool> {
  if (!global.__pgPool__) {
    global.__pgPool__ = await createPool();
  }
  return global.__pgPool__;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = await getPool();
  return pool.query<T>(text, params);
}
