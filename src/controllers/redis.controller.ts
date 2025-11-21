
import { FastifyReply, FastifyRequest } from "fastify";
import * as RedisStore from "../stores/redis.store";

export async function getActiveOrdersHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const activeOrderIds = await RedisStore.getAllActiveOrders();
    const orders = [];
    
    for (const orderId of activeOrderIds) {
      const order = await RedisStore.getOrderFromRedis(orderId);
      if (order) {
        orders.push(order);
      }
    }
    
    return reply.send({
      count: activeOrderIds.length,
      orders
    });
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to get active orders" });
  }
}