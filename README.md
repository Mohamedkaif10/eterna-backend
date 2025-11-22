# README
This project is a Fastify backend that simulates order execution on decentralized exchanges. It supports order creation, routing, execution, and live status updates via WebSocket. The system uses Redis, PostgreSQL, and BullMQ to coordinate all steps, while applying AMM-style price calculations like real DEXs such as Raydium or Meteora.

## Overview

When a client submits an order, the backend performs a full execution workflow including queuing, routing across DEXs, slippage checks, simulated swapping, and storing results. The system is fully deterministic and does not rely on any real blockchain RPC.

All routing and swap logic is implemented using in-memory AMM pools. This allows the project to simulate how a DEX calculates output amounts without making external network calls.

## DEX simulation explained

The system simulates Raydium and Meteora using a constant-product AMM formula. Each pool has:

- tokenA reserves
- tokenB reserves
- a trading fee

The price is not fixed; it changes depending on how much a user wants to buy or sell. This matches how real AMMs behave.

## How swaps are calculated

The swap is calculated using the constant product formula:
```
amountAfterFee = amountIn * (1 - fee)
amountOut = (amountAfterFee * B) / (A + amountAfterFee)
```
Where:
- A = reserve of the input token
- B = reserve of the output token
- fee = pool fee (e.g., 0.25%)
- amountIn = user input
- amountOut = amount user will receive
This mirrors how Raydium or Uniswap compute swap output.

Because A increases during the trade and B decreases, the price is impact-based: large trades move the price. The system intentionally follows this behavior to reflect realistic DEX trading.

## Why routing is needed

Raydium and Meteora each have different reserves and different fees.
Given the same input amount, both DEXs will return different output amounts.

The system fetches quotes from both:

- Raydium quote
- Meteora quote

Then selects the one offering the highest output. This is identical to how routing aggregators (like Jupiter on Solana) select the best trading venue.

## Slippage handling

Once routing selects a best DEX, a minimum acceptable output is computed:
```
minimum = expectedOut * (1 - slippagePct/100)
```

After executing the simulated swap, the actual output is compared with the minimum.
If actual output is lower, the order fails.
This matches real blockchain DEX execution where high price movement leads to swap reversion.

## SOL wrapping / unwrapping

If the user trades with SOL, it must be converted to WSOL first.
This simulation includes wrapping/unwrapping to follow the real workflow used on Solana DEXs.

## Order execution flow

1. Order is received.
2. Order is stored in Redis, PostgreSQL, and in memory.
3. Backend waits for client WebSocket connection.
4. Order is added to BullMQ queue.
5. Execution steps are streamed live to the client:
     - pending
     - wrap SOL (if needed)
     - routing
     - building
     - submitting
     - unwrapping (if needed)
     - confirmed
6.Final order state is saved and broadcasted.

## Why the system uses three storage layers

- Redis: fast storage for active orders
- PostgreSQL: permanent history
- In-memory: temporary execution state for single cycle

This gives performance without losing historical data.

## How to run the project

1. Install dependencies
2. Ensure Redis and PostgreSQL are running
3. Start the server
4. Connect WebSocket for live updates
5. View queue using Bull Board

## API endpoints

```
POST /api/orders/:orderId
GET /api/orders/:orderId (WebSocket)
GET /api/queue/status
GET /api/redis/active-orders
GET /api/history/orders
GET /api/history/orders/:status
```

## Example Json 
```
{
    "orderId": "order40",
    "status": "routed",
    "route": {
        "venue": "raydium",
        "expectedOut": 14.901939413008332,
        "priceImpactPct": 0.014970730724360804,
        "feePct": 0.25
    },
    "routingLog": {
        "raydium": {
            "venue": "raydium",
            "expectedOut": 14.901939413008332,
            "priceImpactPct": 0.014970730724360804,
            "feePct": 0.25
        },
        "meteora": {
            "venue": "meteora",
            "expectedOut": 12.24651517879794,
            "priceImpactPct": 0.013636363636363637,
            "feePct": 0.2
        },
        "chosen": "raydium",
        "timestamp": "2025-11-22T15:29:37.337Z"
    },
    "timestamp": "2025-11-22T15:29:37.339Z",
    "message": "Best route found via raydium",
    "step": 3,
    "totalSteps": 7
}
```

For the post request 
```
http://localhost:3000/api/orders/order40
{
  "side": "buy",
  "baseToken": "TOKEN_B",
  "quoteToken": "TOKEN_A",
  "amount": 15,
  "slippagePct": 0.7
}
```
## Routing 
<img width="1018" height="291" alt="Screenshot 2025-11-22 at 9 02 06 PM" src="https://github.com/user-attachments/assets/9ac62257-f13a-4145-847c-845161329d81" />



