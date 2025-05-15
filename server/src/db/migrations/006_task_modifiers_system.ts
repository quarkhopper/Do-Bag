// @ts-ignore
// Using require instead of import to bypass TypeScript module resolution issues
const pg = require('pg');
const { Pool } = pg;

const migrationName = '006_task_modifiers_system';

// Use 'any' as a type definition bypass to avoid import errors
export async function up(pool: any) {
  await pool.query(`
    -- Ensure UUID extension is available
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create modifiers table
    CREATE TABLE IF NOT EXISTS modifiers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      config JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create task_modifiers mapping table
    CREATE TABLE IF NOT EXISTS task_modifiers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID NOT NULL,
      modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
      value JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, modifier_id)
    );

    -- Add trigger for updating the updated_at timestamp
    CREATE OR REPLACE FUNCTION update_task_modifiers_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_task_modifiers_updated_at
      BEFORE UPDATE ON task_modifiers
      FOR EACH ROW
      EXECUTE FUNCTION update_task_modifiers_updated_at();

    -- Create temporary table to store task data during migration
    CREATE TEMPORARY TABLE temp_tasks AS
    SELECT * FROM tasks;

    -- Create new tasks table with UUID as primary key
    CREATE TABLE new_tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      text TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      user_id UUID,
      status TEXT DEFAULT 'bag' CHECK (status IN ('bag', 'shelf'))
    );

    -- Migrate users table to use UUIDs if not already done
    -- First, create a new users table with UUID primary key
    CREATE TABLE IF NOT EXISTS new_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      verification_token_expires_at TIMESTAMP WITH TIME ZONE
    );

    -- Copy users data to new table
    INSERT INTO new_users (
      id,
      email,
      password_hash,
      name,
      created_at,
      email_verified,
      verification_token,
      verification_token_expires_at
    )
    SELECT 
      uuid_generate_v4(),
      email,
      password_hash,
      name,
      created_at,
      email_verified,
      verification_token,
      verification_token_expires_at
    FROM users;

    -- Create mapping table to track old ID to new UUID for users
    CREATE TEMPORARY TABLE user_id_mapping (
      old_id INTEGER PRIMARY KEY,
      new_id UUID NOT NULL
    );

    -- Fill the mapping table
    INSERT INTO user_id_mapping (old_id, new_id)
    SELECT u.id, nu.id
    FROM users u
    JOIN new_users nu ON u.email = nu.email;

    -- Migrate tasks
    -- Insert into new tasks table with generated UUIDs
    INSERT INTO new_tasks (
      id,
      text,
      position,
      created_at,
      status,
      user_id
    )
    SELECT 
      uuid_generate_v4(),
      t.text,
      t.position,
      t.created_at,
      t.status,
      um.new_id
    FROM temp_tasks t
    LEFT JOIN user_id_mapping um ON t.user_id = um.old_id;

    -- Create mapping table to track old task ID to new UUID
    CREATE TEMPORARY TABLE task_id_mapping (
      old_id INTEGER PRIMARY KEY,
      new_id UUID NOT NULL
    );

    -- Fill the task mapping table
    INSERT INTO task_id_mapping (old_id, new_id)
    SELECT t.id, nt.id
    FROM temp_tasks t
    JOIN new_tasks nt ON t.text = nt.text AND t.position = nt.position
    ORDER BY t.id;

    -- Insert default modifiers
    INSERT INTO modifiers (name, description, type, config)
    VALUES 
      ('Duration', 'Expected time needed to complete the task', 'duration', '{"unit": "minutes", "min": 5, "max": 480, "step": 5}'),
      ('Priority', 'Task importance level', 'priority', '{"levels": ["low", "medium", "high"]}'),
      ('Divisibility', 'Whether the task can be divided into smaller segments', 'boolean', '{"default": false}');

    -- Store modifier IDs for data migration
    DO $$
    DECLARE
      duration_id UUID;
      priority_id UUID;
      divisibility_id UUID;
    BEGIN
      SELECT id INTO duration_id FROM modifiers WHERE name = 'Duration';
      SELECT id INTO priority_id FROM modifiers WHERE name = 'Priority';
      SELECT id INTO divisibility_id FROM modifiers WHERE name = 'Divisibility';

      -- Migrate existing task attributes to modifiers
      -- Duration modifier
      INSERT INTO task_modifiers (task_id, modifier_id, value)
      SELECT 
        tm.new_id,
        duration_id,
        jsonb_build_object('value', t.expected_duration)
      FROM temp_tasks t
      JOIN task_id_mapping tm ON t.id = tm.old_id
      WHERE t.expected_duration IS NOT NULL;

      -- Priority modifier
      INSERT INTO task_modifiers (task_id, modifier_id, value)
      SELECT 
        tm.new_id,
        priority_id,
        jsonb_build_object('value', t.priority_hint)
      FROM temp_tasks t
      JOIN task_id_mapping tm ON t.id = tm.old_id
      WHERE t.priority_hint IS NOT NULL;

      -- Divisibility modifier
      INSERT INTO task_modifiers (task_id, modifier_id, value)
      SELECT 
        tm.new_id,
        divisibility_id,
        jsonb_build_object('value', t.is_divisible)
      FROM temp_tasks t
      JOIN task_id_mapping tm ON t.id = tm.old_id
      WHERE t.is_divisible IS NOT NULL;
    END $$;

    -- Drop old tables and rename new ones
    DROP TABLE tasks;
    ALTER TABLE new_tasks RENAME TO tasks;
    
    -- Add foreign key constraint to task_modifiers after tasks table is renamed
    ALTER TABLE task_modifiers
    ADD CONSTRAINT fk_task_modifiers_task_id
    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE;

    -- Create index on task_id in task_modifiers
    CREATE INDEX idx_task_modifiers_task_id ON task_modifiers(task_id);

    -- Drop old users table and rename new one
    DROP TABLE users;
    ALTER TABLE new_users RENAME TO users;

    -- Clean up temporary tables
    DROP TABLE temp_tasks;
    DROP TABLE user_id_mapping;
    DROP TABLE task_id_mapping;
  `);
}

export async function down(pool: any) {
  await pool.query(`
    -- Create temporary tables to store the data
    CREATE TEMPORARY TABLE temp_tasks AS
    SELECT 
      t.id,
      t.text,
      t.position,
      t.created_at,
      t.status,
      t.user_id,
      (SELECT tm.value->>'value' FROM task_modifiers tm JOIN modifiers m ON tm.modifier_id = m.id WHERE tm.task_id = t.id AND m.name = 'Duration') as expected_duration,
      (SELECT (tm.value->>'value')::boolean FROM task_modifiers tm JOIN modifiers m ON tm.modifier_id = m.id WHERE tm.task_id = t.id AND m.name = 'Divisibility') as is_divisible,
      (SELECT tm.value->>'value' FROM task_modifiers tm JOIN modifiers m ON tm.modifier_id = m.id WHERE tm.task_id = t.id AND m.name = 'Priority') as priority_hint
    FROM tasks t;
    
    -- Create tables with old structure
    CREATE TABLE old_tasks (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      expected_duration TEXT,
      is_divisible BOOLEAN DEFAULT false,
      priority_hint TEXT CHECK (priority_hint IN ('low', 'medium', 'high')),
      position INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      status TEXT DEFAULT 'bag' CHECK (status IN ('bag', 'shelf'))
    );
    
    -- Create old users table with SERIAL id
    CREATE TABLE old_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      verification_token_expires_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Copy users data
    INSERT INTO old_users (
      email,
      password_hash,
      name,
      created_at,
      email_verified,
      verification_token,
      verification_token_expires_at
    )
    SELECT 
      email,
      password_hash,
      name,
      created_at,
      email_verified,
      verification_token,
      verification_token_expires_at
    FROM users;

    -- Create mapping table for user IDs
    CREATE TEMPORARY TABLE user_id_mapping (
      old_uuid UUID,
      new_id INTEGER
    );
    
    -- Fill user mapping
    INSERT INTO user_id_mapping (old_uuid, new_id)
    SELECT u.id, ou.id
    FROM users u
    JOIN old_users ou ON u.email = ou.email;
    
    -- Copy tasks data
    INSERT INTO old_tasks (
      text,
      expected_duration,
      is_divisible,
      priority_hint,
      position,
      created_at,
      user_id,
      status
    )
    SELECT 
      tt.text,
      tt.expected_duration,
      tt.is_divisible,
      tt.priority_hint,
      tt.position,
      tt.created_at,
      um.new_id,
      tt.status
    FROM temp_tasks tt
    LEFT JOIN user_id_mapping um ON tt.user_id = um.old_uuid;
    
    -- Drop new tables
    DROP TABLE task_modifiers;
    DROP TABLE modifiers;
    DROP TABLE tasks;
    DROP TABLE users;
    
    -- Rename old tables to original names
    ALTER TABLE old_tasks RENAME TO tasks;
    ALTER TABLE old_users RENAME TO users;
    
    -- Clean up temporary tables
    DROP TABLE temp_tasks;
    DROP TABLE user_id_mapping;
  `);
}

export { migrationName };