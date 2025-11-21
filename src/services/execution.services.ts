import { wsBroadcast } from "../lib/ws";
import { Order, OrderStatus } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import { findBestRoute } from "./routing.service";
import { randomUUID } from "crypto";
import { isNativeSol, wrapSol, unwrapSol, WRAPPED_SOL } from "../utils/sol.util";

export async function startExecution(orderId: string) {
  try {

    const order = InMemStore.getOrder(orderId);
    if (!order) {
      wsBroadcast(orderId, { orderId, status: "failed", reason: "order_not_found" });
      return;
    }

    console.log(`\n=== START EXECUTION ${orderId} ===`);

    const now = () => new Date().toISOString();

    let inputAmount = order.amount;
    let tradeBaseToken = order.baseToken;

    if (isNativeSol(order.baseToken)) {
      console.log(`[WSOL] Wrapping ${inputAmount} SOL → WSOL`);

      inputAmount = wrapSol(inputAmount);
      tradeBaseToken = WRAPPED_SOL;

      wsBroadcast(orderId, {
        orderId,
        status: "wrap_sol",
        amount: inputAmount,
        message: "Wrapped SOL to WSOL"
      });
    }
    order.status = OrderStatus.PENDING;
    order.updatedAt = now();
    InMemStore.saveOrder(order);

    wsBroadcast(orderId, {
      orderId,
      status: "pending",
      timestamp: order.updatedAt
    });

    await sleep(300);
    wsBroadcast(orderId, {
      orderId,
      status: "routing",
      timestamp: now(),
      message: "Fetching quotes from Raydium & Meteora"
    });

    const { best, routingLog } = await findBestRoute(inputAmount);
    order.meta = { ...order.meta, routingLog, bestRoute: best };
    order.status = OrderStatus.ROUTED;
    order.updatedAt = now();
    InMemStore.saveOrder(order);

    wsBroadcast(orderId, {
      orderId,
      status: "routed",
      route: best,
      routingLog,
      timestamp: order.updatedAt
    });

    await sleep(300);
    order.status = OrderStatus.BUILDING;
    order.updatedAt = now();
    InMemStore.saveOrder(order);

    wsBroadcast(orderId, {
      orderId,
      status: "building",
      timestamp: order.updatedAt
    });

    await sleep(400);
    const expectedOut = best.expectedOut;
    const slippagePct = order.slippagePct ?? 0.5;
    const minAcceptableOut = expectedOut * (1 - slippagePct / 100);

    const poolId =
      best.venue === "raydium"
        ? InMemStore.raydiumPool.id
        : InMemStore.meteoraPool.id;

    const actualOut = InMemStore.applySwap(poolId, inputAmount);

    if (actualOut < minAcceptableOut) {
      order.status = OrderStatus.FAILED;
      order.updatedAt = now();
      InMemStore.saveOrder(order);

      wsBroadcast(orderId, {
        orderId,
        status: "failed",
        reason: "slippage_exceeded",
        expectedOut,
        actualOut,
        minAcceptableOut
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
      timestamp: order.updatedAt
    });

    await sleep(800);

    let outputAmount = actualOut;

    if (isNativeSol(order.baseToken)) {
      outputAmount = unwrapSol(actualOut);

      wsBroadcast(orderId, {
        orderId,
        status: "unwrap_sol",
        amount: outputAmount,
        message: "Unwrapped WSOL → SOL"
      });
    }

    const fill = {
      pool: best.venue,
      amountIn: order.amount,
      amountOut: outputAmount,
      timestamp: now()
    };

    order.fills.push(fill);
    order.status = OrderStatus.CONFIRMED;
    order.updatedAt = now();
    InMemStore.saveOrder(order);

    wsBroadcast(orderId, {
      orderId,
      status: "confirmed",
      txHash,
      fills: order.fills,
      avgPrice: Number((outputAmount / order.amount).toFixed(6)),
      timestamp: order.updatedAt
    });

    console.log(`=== ORDER COMPLETE ${orderId} ===\n`);

  } catch (err: any) {
    console.error(err);

    wsBroadcast(orderId, {
      orderId,
      status: "failed",
      reason: err.message ?? "execution_error"
    });
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
