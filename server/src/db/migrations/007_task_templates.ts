// @ts-ignore
// Using require instead of import to bypass TypeScript module resolution issues
const pg = require('pg');
const { Pool } = pg;

const migrationName = '007_task_templates';

// Use 'any' as a type definition bypass to avoid import errors
export async function up(pool: any) {
  await pool.query(`
    -- Add template-related fields to tasks table
    ALTER TABLE tasks
    ADD COLUMN is_template BOOLEAN DEFAULT false,
    ADD COLUMN template_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

    -- Create index for efficient template queries
    CREATE INDEX idx_tasks_is_template ON tasks(is_template);
    CREATE INDEX idx_tasks_template_id ON tasks(template_id);
    
    -- Update existing tasks in the shelf to be templates
    UPDATE tasks
    SET is_template = true
    WHERE status = 'shelf';
  `);
}

export async function down(pool: any) {
  await pool.query(`
    -- Remove indexes first
    DROP INDEX IF EXISTS idx_tasks_is_template;
    DROP INDEX IF EXISTS idx_tasks_template_id;
    
    -- Remove template-related fields
    ALTER TABLE tasks
    DROP COLUMN IF EXISTS is_template,
    DROP COLUMN IF EXISTS template_id;
  `);
}

export { migrationName };
