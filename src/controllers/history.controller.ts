import { FastifyReply, FastifyRequest } from "fastify";
import * as PostgresStore from "../stores/postgres.store";

export async function getOrderHistoryHandler(
  request: FastifyRequest<{
    Querystring: { limit?: string; offset?: string }
  }>,
  reply: FastifyReply
) {
  try {
    const limit = parseInt(request.query.limit || '100');
    const offset = parseInt(request.query.offset || '0');
    
    const orders = await PostgresStore.getOrderHistory(limit, offset);
    
    return reply.send({
      count: orders.length,
      orders
    });
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to get order history" });
  }
}

export async function getOrdersByStatusHandler(
  request: FastifyRequest<{
    Params: { status: string }
  }>,
  reply: FastifyReply
) {
  try {
    const { status } = request.params;
    const orders = await PostgresStore.getOrdersByStatus(status as any);
    
    return reply.send({
      count: orders.length,
      orders
    });
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to get orders by status" });
  }
}