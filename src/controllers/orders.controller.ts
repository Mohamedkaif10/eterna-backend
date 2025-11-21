
import { FastifyReply, FastifyRequest } from "fastify";
import * as OrderService from "../services/order.service";
import { CreateOrderPayload } from "../models/order.model";

export async function executeOrderHandler(
  request: FastifyRequest<{ 
    Params: { orderId: string };
    Body: CreateOrderPayload 
  }>,
  reply: FastifyReply
) {
  if (request.raw.url?.includes('websocket') || request.headers.upgrade === 'websocket') {
    return reply.send({ message: 'Use WebSocket connection for real-time updates' });
  }

  try {
    const orderId = request.params.orderId;
    const body = request.body as unknown as CreateOrderPayload;

    if (!body || !body.baseToken || !body.quoteToken) {
      return reply.status(400).send({ error: "baseToken and quoteToken required" });
    }
    if (!["buy", "sell"].includes(body.side)) {
      return reply.status(400).send({ error: "side must be 'buy' or 'sell'" });
    }
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return reply.status(400).send({ error: "amount must be a number > 0" });
    }

    const createdOrderId = await OrderService.createOrder({
      baseToken: body.baseToken,
      quoteToken: body.quoteToken,
      side: body.side,
      amount: body.amount,
      slippagePct: body.slippagePct ?? 0.5,
      clientId: orderId
    });

    return reply.status(201).send({ 
      orderId: createdOrderId,
      message: "Order execution started. WebSocket connection should receive real-time updates."
    });
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "internal_server_error" });
  }
}