import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import env from '#env';

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.get('DATABASE_URL'));
if (env.get('NODE_ENV') !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, {
  // logger: true,
});
