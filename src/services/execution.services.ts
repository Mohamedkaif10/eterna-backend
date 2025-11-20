
import { wsBroadcast } from "../plugins/websocket.plugin"; 
import { Order, OrderStatus } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import { findBestRoute } from "./routing.service";
import { randomUUID } from "crypto";

export async function startExecution(orderId: string) {
  console.log(`Starting execution for order: ${orderId}`);
  
  try {
    const order = InMemStore.getOrder(orderId);
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      wsBroadcast(orderId, { 
        orderId, 
        status: "failed", 
        reason: "order_not_found" 
      });
      return;
    }

    const now = () => new Date().toISOString();

    console.log(`Order ${orderId}: PENDING`);
    order.status = OrderStatus.PENDING;
    order.updatedAt = now();
    InMemStore.saveOrder(order);
    wsBroadcast(orderId, { 
      orderId, 
      status: "pending", 
      timestamp: order.updatedAt,
      message: "Order processing started" 
    });

    await new Promise(res => setTimeout(res, 300));

    console.log(`Order ${orderId}: ROUTING`);
    wsBroadcast(orderId, { 
      orderId, 
      status: "routing", 
      timestamp: now(),
      message: "Finding best route..." 
    });
    
    const bestQuote = await findBestRoute(order.amount);
    console.log(`Order ${orderId}: Best route found:`, bestQuote);

    order.meta = { ...order.meta, bestQuote };
    order.status = OrderStatus.ROUTED;
    order.updatedAt = now();
    InMemStore.saveOrder(order);
    wsBroadcast(orderId, { 
      orderId, 
      status: "routed", 
      route: bestQuote, 
      timestamp: order.updatedAt,
      message: `Best route found via ${bestQuote.venue}` 
    });

    await new Promise(res => setTimeout(res, 300));

    console.log(`Order ${orderId}: BUILDING`);
    order.status = OrderStatus.BUILDING;
    order.updatedAt = now();
    InMemStore.saveOrder(order);
    wsBroadcast(orderId, { 
      orderId, 
      status: "building", 
      timestamp: order.updatedAt,
      message: "Building transaction..." 
    });

    await new Promise((res) => setTimeout(res, 500));

    console.log(`Order ${orderId}: SUBMITTING`);
    const expectedOut = Number(bestQuote.expectedOut);
    const slippagePct = order.slippagePct ?? 0.5;
    const minAcceptableOut = expectedOut * (1 - slippagePct / 100);

    const poolId = bestQuote.venue === "raydium" ? InMemStore.raydiumPool.id : InMemStore.meteoraPool.id;
    const actualOut = InMemStore.applySwap(poolId, order.amount);

    console.log(`Order ${orderId}: Slippage check - Expected: ${expectedOut}, Actual: ${actualOut}, Min: ${minAcceptableOut}`);

    if (actualOut < minAcceptableOut) {
      console.log(`Order ${orderId}: SLIPPAGE EXCEEDED`);
      order.status = OrderStatus.FAILED;
      order.updatedAt = now();
      InMemStore.saveOrder(order);

      wsBroadcast(orderId, { 
        orderId, 
        status: "failed", 
        reason: "slippage_exceeded", 
        expectedOut, 
        actualOut, 
        minAcceptableOut,
        timestamp: order.updatedAt,
        message: "Transaction failed: slippage too high" 
      });
      return;
    }

    const txHash = `mock_tx_${randomUUID().slice(0, 8)}`;
    order.meta = { ...order.meta, txHash };
    order.status = OrderStatus.SUBMITTED;
    order.updatedAt = now();
    InMemStore.saveOrder(order);
    
    wsBroadcast(orderId, { 
      orderId, 
      status: "submitted", 
      txHash, 
      timestamp: order.updatedAt,
      message: "Transaction submitted to network" 
    });

    console.log(`Order ${orderId}: SUBMITTED with tx: ${txHash}`);

    await new Promise((res) => setTimeout(res, 800));

    console.log(`Order ${orderId}: CONFIRMING`);
    const filledAmountOut = actualOut;
    const fill = {
      pool: bestQuote.venue,
      amountIn: order.amount,
      amountOut: filledAmountOut,
      timestamp: new Date().toISOString(),
    };

    order.fills.push(fill);
    order.status = OrderStatus.CONFIRMED;
    order.updatedAt = now();
    InMemStore.saveOrder(order);

    const avgPrice = Number((filledAmountOut / order.amount).toFixed(12));

    wsBroadcast(orderId, {
      orderId,
      status: "confirmed",
      txHash,
      fills: order.fills,
      avgPrice,
      timestamp: order.updatedAt,
      message: "Order completed successfully!"
    });

    console.log(`Order ${orderId}: COMPLETED - Avg Price: ${avgPrice}`);

  } catch (err: any) {
    console.error(`Execution error for order ${orderId}:`, err);
    const reason = err?.message ?? "execution_error";
    const order = InMemStore.getOrder(orderId);
    if (order) {
      order.status = OrderStatus.FAILED;
      order.updatedAt = new Date().toISOString();
      InMemStore.saveOrder(order);
    }
    wsBroadcast(orderId, { 
      orderId, 
      status: "failed", 
      reason,
      error: err.message,
      message: `Order failed: ${reason}` 
    });
  }
}