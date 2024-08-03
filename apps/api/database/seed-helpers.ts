import cliProgress from 'cli-progress';
import { getTableName, sql } from 'drizzle-orm';
import type { db } from './index.js';
import { User } from './schema/user.js';

export type DB = typeof db;

export async function insertDataInBatches<T>(
  name: string,
  dataToInsert: T[],
  batchSize: number,
  insertFunction: (batch: T[]) => Promise<any>
) {
  const progressBar = new cliProgress.SingleBar(
    {
      format: `Inserting ${name}... [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}`,
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(dataToInsert.length, 0);
  for (let i = 0; i < dataToInsert.length; i += batchSize) {
    progressBar.update(Math.min(i + batchSize, dataToInsert.length));
    const batch = dataToInsert.slice(i, i + batchSize);
    await insertFunction(batch);
  }
}

export async function clearDatabase(db: DB) {
  console.debug('Clearing database');

  const tables = [User];

  const progressBar = new cliProgress.SingleBar(
    {
      format:
        'Deleting tables... [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(tables.length, 0);

  for (let i = 0; i < tables.length; i++) {
    progressBar.update(i);
    await db.delete(tables[i]!);
    try {
      await db.execute(
        sql.raw(
          `ALTER SEQUENCE "public"."${getTableName(tables[i]!)}_id_seq" RESTART WITH 1`
        )
      );
    } catch (e) {
      console.warn(e.message);
    }
  }
}
