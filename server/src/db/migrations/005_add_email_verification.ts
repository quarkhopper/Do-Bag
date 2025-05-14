import { Pool } from 'pg';

const migrationName = '005_add_email_verification';

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_token TEXT,
    ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;
  `);
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE users 
    DROP COLUMN IF EXISTS email_verified,
    DROP COLUMN IF EXISTS verification_token,
    DROP COLUMN IF EXISTS verification_token_expires_at;
  `);
}

export { migrationName }; 