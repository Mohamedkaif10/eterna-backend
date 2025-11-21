
import { wsBroadcast } from "../plugins/websocket.plugin";
import { Order, OrderStatus } from "../models/order.model";
import * as InMemStore from "../stores/inmem.store";
import { findBestRoute } from "./routing.service";
import { randomUUID } from "crypto";
import { isNativeSol, wrapSol, unwrapSol, WRAPPED_SOL } from "../utils/sol.util";

export async function startExecution(orderId: string) {
  console.log(`\nSTARTING EXECUTION FOR ORDER: ${orderId}`);
  
  try {
    const order = InMemStore.getOrder(orderId);
    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      wsBroadcast(orderId, { 
        orderId, 
        status: "failed", 
        reason: "order_not_found" 
      });
      return;
    }

    const now = () => new Date().toISOString();


    console.log(`⏳ [${orderId}] STEP 1: PENDING`);
    order.status = OrderStatus.PENDING;
    order.updatedAt = now();
    InMemStore.saveOrder(order);
    wsBroadcast(orderId, { 
      orderId, 
      status: "pending", 
      timestamp: order.updatedAt,
      message: "Order processing started",
      step: 1,
      totalSteps: 7
    });
    await sleep(2000);


    let inputAmount = order.amount;
    let tradeBaseToken = order.baseToken;
    let needsUnwrap = false;

    if (isNativeSol(order.baseToken)) {
      console.log(`🔄 [${orderId}] Wrapping ${inputAmount} SOL → WSOL`);
      
      inputAmount = wrapSol(inputAmount);
      tradeBaseToken = WRAPPED_SOL;
      needsUnwrap = true;

      wsBroadcast(orderId, {
        orderId,
        status: "wrap_sol",
        amount: inputAmount,
        originalAmount: order.amount,
        timestamp: now(),
        message: `Wrapped ${order.amount} SOL to ${inputAmount} WSOL`,
        step: 2,
        totalSteps: 7
      });
      await sleep(1500);
    } else {

      console.log(`⏭️ [${orderId}] No SOL wrapping needed`);
    }


    console.log(`🗺️ [${orderId}] STEP 3: ROUTING`);
    wsBroadcast(orderId, { 
      orderId, 
      status: "routing", 
      timestamp: now(),
      message: "Fetching quotes from Raydium & Meteora...",
      step: 3,
      totalSteps: 7
    });
    

    await sleep(1000);
    const { best, routingLog } = await findBestRoute(inputAmount);
    
    console.log(`📊 [${orderId}] ROUTING DECISIONS:`);
    console.log(routingLog);
    
    order.meta = { ...order.meta, routingLog, bestRoute: best };
    order.status = OrderStatus.ROUTED;
    order.updatedAt = now();
    InMemStore.saveOrder(order);

    wsBroadcast(orderId, {
      orderId,
      status: "routed",
      route: best,
      routingLog: routingLog,
      timestamp: order.updatedAt,
      message: `Best route found via ${best.venue}`,
      step: 3,
      totalSteps: 7
    });
    await sleep(2000);

 
    console.log(`🔨 [${orderId}] STEP 4: BUILDING`);
    order.status = OrderStatus.BUILDING;
    order.updatedAt = now();
    InMemStore.saveOrder(order);
    wsBroadcast(orderId, { 
      orderId, 
      status: "building", 
      timestamp: order.updatedAt,
      message: "Building transaction...",
      step: 4,
      totalSteps: 7
    });
    await sleep(2000);


    console.log(`📤 [${orderId}] STEP 5: SUBMITTING`);
    const expectedOut = best.expectedOut;
    const slippagePct = order.slippagePct ?? 0.5;
    const minAcceptableOut = expectedOut * (1 - slippagePct / 100);

    const poolId = best.venue === "raydium" 
      ? InMemStore.raydiumPool.id 
      : InMemStore.meteoraPool.id;

    const actualOut = InMemStore.applySwap(poolId, inputAmount);

    console.log(`📊 [${orderId}] Slippage check - Expected: ${expectedOut}, Actual: ${actualOut}, Min: ${minAcceptableOut}`);

    if (actualOut < minAcceptableOut) {
      console.log(`❌ [${orderId}] SLIPPAGE EXCEEDED`);
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
        message: "Transaction failed: slippage too high",
        step: 5,
        totalSteps: 7
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
      message: "Transaction submitted to network",
      step: 5,
      totalSteps: 7
    });

    console.log(`✅ [${orderId}] SUBMITTED with tx: ${txHash}`);
    await sleep(3000);


    let outputAmount = actualOut;
    
    if (needsUnwrap) {
      console.log(`🔄 [${orderId}] Unwrapping ${outputAmount} WSOL → SOL`);
      
      outputAmount = unwrapSol(actualOut);

      wsBroadcast(orderId, {
        orderId,
        status: "unwrap_sol",
        amount: outputAmount,
        wrappedAmount: actualOut,
        timestamp: now(),
        message: `Unwrapped ${actualOut} WSOL to ${outputAmount} SOL`,
        step: 6,
        totalSteps: 7
      });
      await sleep(1500);
    } else {
      console.log(`⏭️ [${orderId}] No SOL unwrapping needed`);
    }


    console.log(`✅ [${orderId}] STEP 7: CONFIRMED`);
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

    const avgPrice = Number((outputAmount / order.amount).toFixed(6));

    wsBroadcast(orderId, {
      orderId,
      status: "confirmed",
      txHash,
      fills: order.fills,
      avgPrice,
      timestamp: order.updatedAt,
      message: "🎉 Order completed successfully!",
      step: 7,
      totalSteps: 7,
      routingLog: order.meta?.routingLog 
    });

    console.log(`🎉 [${orderId}] COMPLETED - Avg Price: ${avgPrice}`);
    console.log(`=== ORDER COMPLETE ${orderId} ===\n`);

  } catch (err: any) {
    console.error(`💥 Execution error for order ${orderId}:`, err);
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
      message: `❌ Order failed: ${reason}` 
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}