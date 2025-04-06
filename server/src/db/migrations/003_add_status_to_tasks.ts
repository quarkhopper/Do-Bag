import { Pool } from 'pg';

const migrationName = '003_add_status_to_tasks';

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'bag';
    
    -- Add check constraint to the status column
    ALTER TABLE tasks 
    ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('bag', 'shelf'));

    -- Update any existing rows to have 'bag' status
    UPDATE tasks SET status = 'bag' WHERE status IS NULL;
  `);
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE tasks DROP COLUMN IF EXISTS status;
  `);
}

export { migrationName }; 