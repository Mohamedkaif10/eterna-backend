import { Order, OrderStatus, CreateOrderPayload } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import { randomUUID } from "crypto";

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

  return id;
}
