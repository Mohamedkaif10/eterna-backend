
import { Order, OrderStatus, CreateOrderPayload } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import { randomUUID } from "crypto";
import { wsBroadcast } from "../plugins/websocket.plugin";
import { startExecution } from "./execution.services";

export async function createOrder(payload: CreateOrderPayload): Promise<string> {
  const id = `order_${randomUUID()}`;
  const now = new Date().toISOString();

  const order: Order = {
    id,
    type: "market",
    side: payload.side,
    baseToken: payload.baseToken,
    quoteToken: payload.quoteToken,
    amount: payload.amount,
    slippagePct: payload.slippagePct ?? 0.5,
    status: OrderStatus.CREATED,
    createdAt: now,
    updatedAt: now,
    fills: [],
    ...(payload.clientId ? { clientId: payload.clientId } : {}),
  };

  InMemStore.saveOrder(order);
  console.log(`Order created: ${id}`);

  setTimeout(() => {
    wsBroadcast(id, { 
      orderId: id, 
      status: "accepted", 
      createdAt: now,
      message: "Order accepted and execution starting"
    });

    startExecution(id).catch((e) => {
      console.error("startExecution error:", e);
      wsBroadcast(id, { 
        orderId: id, 
        status: "failed", 
        reason: "execution_start_failed",
        error: e.message 
      });
    });
  }, 100); 

  return id;
}