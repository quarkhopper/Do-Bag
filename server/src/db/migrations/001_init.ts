import { Pool } from 'pg';

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      expected_duration TEXT,
      is_divisible BOOLEAN DEFAULT false,
      priority_hint TEXT CHECK (priority_hint IN ('low', 'medium', 'high')),
      position INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS tasks_position_idx ON tasks(position);
  `);
}

export async function down(pool: Pool) {
  await pool.query(`
    DROP TABLE IF EXISTS tasks;
  `);
} 