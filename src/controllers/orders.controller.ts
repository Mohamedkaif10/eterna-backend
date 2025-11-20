import { FastifyReply, FastifyRequest } from "fastify";
import * as OrderService from "../services/order.service";
import { CreateOrderPayload } from "../models/order.model";


declare module "fastify" {
  interface FastifyInstance {
    wsBroadcast: (orderId: string, message: any) => void;
  }
}

export async function executeOrderHandler(
  request: FastifyRequest<{ Body: CreateOrderPayload }>,
  reply: FastifyReply
) {
  try {
    const body = request.body as unknown as CreateOrderPayload;


    if (!body.baseToken || !body.quoteToken) {
      return reply.status(400).send({ error: "baseToken and quoteToken required" });
    }
    if (!["buy", "sell"].includes(body.side)) {
      return reply.status(400).send({ error: "side must be 'buy' or 'sell'" });
    }
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return reply.status(400).send({ error: "amount must be a number > 0" });
    }

    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    request.server.wsBroadcast(tempOrderId, {
      type: "order_created",
      orderId: tempOrderId,
      status: "validating",
      message: "Validating order parameters...",
      timestamp: new Date().toISOString(),
      data: {
        baseToken: body.baseToken,
        quoteToken: body.quoteToken,
        side: body.side,
        amount: body.amount
      }
    });

    const orderId = await OrderService.createOrder({
      baseToken: body.baseToken,
      quoteToken: body.quoteToken,
      side: body.side,
      amount: body.amount,
      slippagePct: body.slippagePct ?? 0.5, 
      clientId: body.clientId,
    });

    request.server.wsBroadcast(orderId, {
      type: "order_processing",
      orderId,
      status: "processing",
      message: "Order validated and queued for execution",
      timestamp: new Date().toISOString()
    });


    simulateOrderExecution(request.server, orderId, body);

    return reply.status(201).send({ 
      orderId,
      status: "processing",
      message: "Order received and being processed"
    });

  } catch (err) {
    request.log.error(err);
    
  
    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    request.server.wsBroadcast(tempOrderId, {
      type: "order_error",
      orderId: tempOrderId,
      status: "failed",
      message: "Failed to create order",
      error: err instanceof Error ? err.message : "internal_server_error",
      timestamp: new Date().toISOString()
    });

    return reply.status(500).send({ error: "internal_server_error" });
  }
}


function simulateOrderExecution(server: any, orderId: string, orderData: CreateOrderPayload) {
  setTimeout(() => {
    server.wsBroadcast(orderId, {
      type: "order_update",
      orderId,
      status: "finding_liquidity",
      message: "Searching for best liquidity providers...",
      progress: 25,
      timestamp: new Date().toISOString()
    });
  }, 1000);

  setTimeout(() => {
    server.wsBroadcast(orderId, {
      type: "order_update",
      orderId,
      status: "calculating_price",
      message: "Calculating optimal execution price...",
      progress: 50,
      estimatedPrice: calculateEstimatedPrice(orderData),
      timestamp: new Date().toISOString()
    });
  }, 3000);

  setTimeout(() => {
    server.wsBroadcast(orderId, {
      type: "order_update",
      orderId,
      status: "executing",
      message: "Executing trade across liquidity pools...",
      progress: 75,
      timestamp: new Date().toISOString()
    });
  }, 5000);

  setTimeout(() => {
    const filledAmount = orderData.amount * (0.95 + Math.random() * 0.1); 
    const executionPrice = calculateEstimatedPrice(orderData);
    
    server.wsBroadcast(orderId, {
      type: "order_completed",
      orderId,
      status: "completed",
      message: "Order executed successfully",
      progress: 100,
      data: {
        filledAmount: parseFloat(filledAmount.toFixed(6)),
        executionPrice: parseFloat(executionPrice.toFixed(6)),
        totalCost: parseFloat((filledAmount * executionPrice).toFixed(6)),
        fees: parseFloat((filledAmount * executionPrice * 0.003).toFixed(6)), // 0.3% fee
        baseToken: orderData.baseToken,
        quoteToken: orderData.quoteToken,
        side: orderData.side
      },
      timestamp: new Date().toISOString()
    });
  }, 7000);
}

function calculateEstimatedPrice(orderData: CreateOrderPayload): number {
  const priceMap: Record<string, number> = {
    "TOKEN_A/TOKEN_B": 1.2345,
    "TOKEN_B/TOKEN_A": 0.8100,
    "ETH/USDC": 3500.00,
    "USDC/ETH": 0.000285,
    "BTC/USDT": 65000.00,
    "USDT/BTC": 0.00001538
  };

  const pair = `${orderData.baseToken}/${orderData.quoteToken}`;
  const reversePair = `${orderData.quoteToken}/${orderData.baseToken}`;
  
  let price = priceMap[pair] || priceMap[reversePair];
  
  if (!price) {
    price = 0.5 + Math.random() * 1000;
  }

  return price * (0.995 + Math.random() * 0.01);
}