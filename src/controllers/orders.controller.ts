import { FastifyReply, FastifyRequest } from "fastify";
import * as OrderService from "../services/order.service";
import { CreateOrderPayload } from "../models/order.model";

/**
 * Handler for POST /api/orders/execute
 * Validates payload, creates order and returns { orderId }
 */
export async function executeOrderHandler(
  request: FastifyRequest<{ Body: CreateOrderPayload }>,
  reply: FastifyReply
) {
  try {
    const body = request.body as unknown as CreateOrderPayload;

    // Basic validation (more comprehensive validation can be added later)
    if (!body.baseToken || !body.quoteToken) {
      return reply.status(400).send({ error: "baseToken and quoteToken required" });
    }
    if (!["buy", "sell"].includes(body.side)) {
      return reply.status(400).send({ error: "side must be 'buy' or 'sell'" });
    }
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return reply.status(400).send({ error: "amount must be a number > 0" });
    }

    const orderId = await OrderService.createOrder({
      baseToken: body.baseToken,
      quoteToken: body.quoteToken,
      side: body.side,
      amount: body.amount,
      slippagePct: body.slippagePct ?? 0.5, 
      clientId: body.clientId,
    });

    return reply.status(201).send({ orderId });
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "internal_server_error" });
  }
}
