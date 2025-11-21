
import { Order } from "../models/order.model";

const orders = new Map<string, Order>();

export function saveOrder(order: Order) {
  orders.set(order.id, order);
}

export function getOrder(orderId: string): Order | undefined {
  return orders.get(orderId);
}

export function listOrders(): Order[] {
  return Array.from(orders.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export type Pool = {
  id: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  feePct: number; 
};

export const raydiumPool: Pool = {
  id: "raydium_1",
  tokenA: "TOKEN_A",
  tokenB: "TOKEN_B",
  reserveA: 100000,
  reserveB: 100000,
  feePct: 0.25,
};

export const meteoraPool: Pool = {
  id: "meteora_1",
  tokenA: "TOKEN_A",
  tokenB: "TOKEN_B",
  reserveA: 110000,
  reserveB: 90000,
  feePct: 0.20,
};

export const wsolPool = {
  id: "wsol_1",
  tokenA: "WSOL",
  tokenB: "TOKEN_B",
  reserveA: 50000,
  reserveB: 50000,
  feePct: 0.25
};

/**

 *
 * @param poolId
 * @param amountIn
 * @returns 
 *
 
 */
export function applySwap(poolId: string, amountIn: number): number {
  const pool = poolId === raydiumPool.id ? raydiumPool : meteoraPool;
  const A = pool.reserveA;
  const B = pool.reserveB;
  const fee = pool.feePct / 100;

  const amountAfterFee = amountIn * (1 - fee);

  const amountOut = (amountAfterFee * B) / (A + amountAfterFee);

  pool.reserveA = Number((A + amountAfterFee).toFixed(6));
  pool.reserveB = Number((B - amountOut).toFixed(6));

  return Number(amountOut.toFixed(6));
}

export function getPoolByToken(token: string) {
  if (token === "WSOL") return wsolPool;
  if (token === "TOKEN_A") return raydiumPool; 
  if (token === "TOKEN_B") return meteoraPool; 
  return null;
}
