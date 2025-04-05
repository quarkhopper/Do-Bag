import { Pool } from 'pg';
import * as init from './migrations/001_init';

const migrations = [
  init
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
      const migrationName = migration.name || 'init';
      if (!executedMigrations.has(migrationName)) {
        console.log(`Running migration: ${migrationName}`);
        await migration.up(pool);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
        console.log(`Completed migration: ${migrationName}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
} 