import Database from 'better-sqlite3';

export function initDb(dbPath) {
  return new Database(dbPath);
}
