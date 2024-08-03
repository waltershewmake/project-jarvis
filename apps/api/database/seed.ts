import fs from 'node:fs';
import path from 'node:path';
import { db } from './index.js';
import { clearDatabase } from './seed-helpers.js';

export type DB = typeof db;

type SeedModule = {
  default: (db: DB) => Promise<void>;
  dependencies: string[];
};

const seedDir = path.join(process.cwd(), 'database', 'seed');
const files = fs
  .readdirSync(seedDir, { withFileTypes: true })
  .filter((dirent) => dirent.isFile())
  .map((dirent) => dirent.name)
  .filter((file) => file.endsWith('.ts'));

const sortedFiles: string[] = [];
const fileMap: Record<string, string> = {};
const graph: Record<string, string[]> = {};
const visited: Set<string> = new Set();
const tempMarked: Set<string> = new Set();

async function buildGraph() {
  for (const file of files) {
    const filePath = path.join(seedDir, file);
    const seedModule = (await import(filePath)) as SeedModule;
    const fileNameWithoutExtension = file.replace(/\.ts$/, '');

    fileMap[fileNameWithoutExtension] = filePath;
    graph[fileNameWithoutExtension] = seedModule.dependencies || [];
  }
}

function visit(file: string) {
  if (visited.has(file)) return;
  if (tempMarked.has(file)) {
    throw new Error(`Circular dependency detected: ${file}`);
  }

  tempMarked.add(file);
  for (const dep of graph[file] || []) {
    visit(dep);
  }
  tempMarked.delete(file);
  visited.add(file);
  sortedFiles.push(file);
}

async function main() {
  await buildGraph();
  Object.keys(graph).forEach((file) => visit(file));

  await clearDatabase(db);

  for (const file of sortedFiles) {
    console.debug(`Running seed: ${file}`);
    const filePath = fileMap[file];
    const seed = (await import(filePath!)) as SeedModule;
    await seed.default(db);
  }
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
