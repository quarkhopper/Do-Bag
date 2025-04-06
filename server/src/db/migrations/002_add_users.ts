import { Pool } from 'pg';

const migrationName = '002_add_users';

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add user_id to tasks
    ALTER TABLE tasks 
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
  `);
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE tasks DROP COLUMN IF EXISTS user_id;
    DROP TABLE IF EXISTS users;
  `);
}

export { migrationName }; 