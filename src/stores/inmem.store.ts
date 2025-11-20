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
