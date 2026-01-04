import pg from 'pg';
import dotenv from 'dotenv';

// This line reads your .env file in the /server directory
dotenv.config();

const { Pool } = pg;

// This function creates and configures the database connection pool
export function createPool() {
  const pool = new Pool({
    // It correctly uses the DATABASE_URL from your .env file
    connectionString: process.env.DATABASE_URL,
    // SSL configuration for production environments
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Optional: Handle connection pool errors
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle database client', err);
  });

  return pool;
}

// This is the default export that all your route files will use
export default createPool;