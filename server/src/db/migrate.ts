import { Pool } from 'pg';
import * as init from './migrations/001_init';
import * as addUsers from './migrations/002_add_users';
import * as fixUserSchema from './migrations/003_fix_user_schema';

interface Migration {
  up: (pool: Pool) => Promise<void>;
  down: (pool: Pool) => Promise<void>;
  migrationName: string;
}

const migrations: Migration[] = [
  init as Migration,
  addUsers as Migration,
  fixUserSchema as Migration
];

export async function runMigrations(pool: Pool) {
  console.log('Running migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check which migrations have been run
    const { rows } = await pool.query('SELECT name FROM migrations');
    const executedMigrations = new Set(rows.map(row => row.name));

    // Run pending migrations
    for (const migration of migrations) {
      if (!executedMigrations.has(migration.migrationName)) {
        console.log(`Running migration: ${migration.migrationName}`);
        await migration.up(pool);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migration.migrationName]);
        console.log(`Completed migration: ${migration.migrationName}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
} 