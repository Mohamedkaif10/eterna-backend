import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME ,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'market',
        side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
        base_token VARCHAR(50) NOT NULL,
        quote_token VARCHAR(50) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        slippage_pct DECIMAL(5, 2) DEFAULT 0.5,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        client_id VARCHAR(255),
        fills JSONB DEFAULT '[]'
      );
      
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
    `);
    console.log('✅ PostgreSQL database initialized');
  } finally {
    client.release();
  }
}