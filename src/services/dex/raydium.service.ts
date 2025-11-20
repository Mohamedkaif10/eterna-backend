import { DexQuote } from "../../models/quote.model";
import { raydiumPool } from "../../stores/inmem.store";

export function getRaydiumQuote(amountIn: number): DexQuote {
  const A = raydiumPool.reserveA;
  const B = raydiumPool.reserveB;
  const feePct = raydiumPool.feePct / 100;

  const amountAfterFee = amountIn * (1 - feePct);
  const expectedOut = (amountAfterFee * B) / (A + amountAfterFee);
  const priceImpact = (amountIn / A) * 100;

  return {
    venue: "raydium",
    expectedOut,
    priceImpactPct: priceImpact,
    feePct: raydiumPool.feePct,
  };
}
