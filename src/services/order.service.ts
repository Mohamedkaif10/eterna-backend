import { Order, OrderStatus, CreateOrderPayload } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import { randomUUID } from "crypto";
import { wsBroadcast, waitForWebSocketConnection } from "../plugins/websocket.plugin";
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
  console.log(`📦 Order created: ${id}`);

 
  (async () => {
    try {
      console.log(`⏳ Waiting for WebSocket connection for order: ${id}`);
      
      
      await waitForWebSocketConnection(id, 10000); 
      
      console.log(`🔗 Client connected! Starting execution for ${id}`);


      await sleep(500);

  
      wsBroadcast(id, { 
        orderId: id, 
        status: "accepted", 
        createdAt: now,
        message: "Order accepted - starting execution"
      });


      await startExecution(id);

    } catch (err: any) {
      console.error("Background execution start failed or timed out:", err);
   
      wsBroadcast(id, { 
        orderId: id, 
        status: "failed", 
        reason: "execution_start_failed",
        error: err.message 
      });
    }
  })();


  return id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}