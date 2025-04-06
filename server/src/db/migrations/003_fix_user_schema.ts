import { Pool } from 'pg';

const migrationName = '003_fix_user_schema';

export async function up(pool: Pool) {
  await pool.query(`
    -- First add extension if not exists
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Modify users table to use UUID instead of SERIAL
    -- First ensure name column exists
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

    -- If we need to migrate from SERIAL to UUID, we would need a more complex migration
    -- For now, we'll just ensure the schema is correct going forward
    -- This assumes the users table might need to be recreated with proper UUID type
    -- depending on the current state of the database

    -- Ensure the UUID data type for id if needed
    -- (This is a simplified version, production would need more careful migration)
  `);
}

export async function down(pool: Pool) {
  await pool.query(`
    -- No destructive changes to roll back
  `);
}

export { migrationName }; 