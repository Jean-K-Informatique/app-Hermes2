import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const dbPath = env.DATABASE_URL.replace('file:', '').replace(/^sqlite:/, '');
const sqlite = new Database(dbPath === '' ? './dev.db' : dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
