import { Order, OrderStatus, CreateOrderPayload } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import * as RedisStore from "../stores/redis.store";
import * as PostgresStore from "../stores/postgres.store";
import { randomUUID } from "crypto";
import { wsBroadcast, waitForWebSocketConnection } from "../plugins/websocket.plugin.js";
import { addOrderToQueue } from "./queue.service";

export async function createOrder(payload: CreateOrderPayload): Promise<string> {
  const id = payload.clientId || `order_${randomUUID()}`;
  const now = new Date().toISOString();

  const order: Order = {
    id,
    type: "market",
    side: payload.side,
    baseToken: payload.baseToken,
    quoteToken: payload.quoteToken,
    amount: payload.amount,
    slippagePct: payload.slippagePct ?? 0.5,
    status: OrderStatus.QUEUED,
    createdAt: now,
    updatedAt: now,
    fills: [],
  };

  InMemStore.saveOrder(order);
  await RedisStore.saveOrderToRedis(order);
  await PostgresStore.saveOrderToPostgres(order);
  
  console.log(`Order created: ${id}`);

  (async () => {
    try {
      console.log(` Waiting for WebSocket connection for order: ${id}`);
      await waitForWebSocketConnection(id, 3000);
      console.log(`Client connected! Queueing order ${id}`);
      
      wsBroadcast(id, { 
        orderId: id, 
        status: "queued", 
        createdAt: now,
        message: "Order queued - waiting for execution",
        timestamp: new Date().toISOString()
      });
      
      await addOrderToQueue(id);
      
    } catch (err: any) {
      console.error("Failed to queue order:", err);
      
      order.status = OrderStatus.FAILED;
      order.updatedAt = new Date().toISOString();
      
      InMemStore.saveOrder(order);
      await RedisStore.updateOrderStatus(id, OrderStatus.FAILED);
      await PostgresStore.updateOrderStatusInPostgres(id, OrderStatus.FAILED);
      
      wsBroadcast(id, { 
        orderId: id, 
        status: "failed", 
        reason: "queue_failed",
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  })();

  return id;
}