// Database connection and query utilities
import { Pool, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize database with schema
export async function initializeDatabase(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    const client = await pool.connect();
    try {
      await client.query(schema);
      console.log('Database schema initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getPool(): Pool {
  return pool;
}

export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<QueryResult<T>> {
  return pool.query(text, values);
}

export async function getClient() {
  return pool.connect();
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
