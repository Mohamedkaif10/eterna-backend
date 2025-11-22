import { pool } from '../config/database';
import { Order, OrderStatus } from '../models/order.model';

export async function saveOrderToPostgres(order: Order): Promise<void> {
  const query = `
    INSERT INTO orders (
      id, type, side, base_token, quote_token, amount, 
      slippage_pct, status, created_at, updated_at, client_id, fills
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (id) 
    DO UPDATE SET 
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      fills = EXCLUDED.fills
  `;

  const values = [
    order.id,
    order.type,
    order.side,
    order.baseToken,
    order.quoteToken,
    order.amount,
    order.slippagePct,
    order.status,
    order.createdAt,
    order.updatedAt,
    order.clientId || null,
    JSON.stringify(order.fills || [])
  ];

  await pool.query(query, values);
  console.log(`💾 Order ${order.id} saved to PostgreSQL`);
}

export async function getOrderFromPostgres(orderId: string): Promise<Order | null> {
  const query = 'SELECT * FROM orders WHERE id = $1';
  const result = await pool.query(query, [orderId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    side: row.side,
    baseToken: row.base_token,
    quoteToken: row.quote_token,
    amount: parseFloat(row.amount),
    slippagePct: parseFloat(row.slippage_pct),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientId: row.client_id,
    fills: row.fills || []
  };
}

export async function updateOrderStatusInPostgres(orderId: string, status: OrderStatus, fills?: any[]): Promise<void> {
  const query = `
    UPDATE orders 
    SET status = $1, updated_at = $2, fills = $3
    WHERE id = $4
  `;

  await pool.query(query, [
    status, 
    new Date().toISOString(), 
    JSON.stringify(fills || []), 
    orderId
  ]);
  
  console.log(`Order ${orderId} status updated to: ${status} in PostgreSQL`);
}

export async function getOrderHistory(limit: number = 100, offset: number = 0): Promise<Order[]> {
  const query = `
    SELECT * FROM orders 
    ORDER BY created_at DESC 
    LIMIT $1 OFFSET $2
  `;

  const result = await pool.query(query, [limit, offset]);
  
  return result.rows.map((row:any) => ({
    id: row.id,
    type: row.type,
    side: row.side,
    baseToken: row.base_token,
    quoteToken: row.quote_token,
    amount: parseFloat(row.amount),
    slippagePct: parseFloat(row.slippage_pct),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientId: row.client_id,
    fills: row.fills || []
  }));
}

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [status]);
  
  return result.rows.map((row:any) => ({
    id: row.id,
    type: row.type,
    side: row.side,
    baseToken: row.base_token,
    quoteToken: row.quote_token,
    amount: parseFloat(row.amount),
    slippagePct: parseFloat(row.slippage_pct),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientId: row.client_id,
    fills: row.fills || []
  }));
}