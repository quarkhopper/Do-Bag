import { Pool } from 'pg';
import { runMigrations } from './migrate';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Initialize database
(async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Run migrations
    await runMigrations(pool);
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
})();

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = () => pool.connect(); 