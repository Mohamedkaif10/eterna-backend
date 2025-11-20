import { DexQuote } from "../../models/quote.model";
import { meteoraPool } from "../../stores/inmem.store";

export function getMeteoraQuote(amountIn: number): DexQuote {
  const A = meteoraPool.reserveA;
  const B = meteoraPool.reserveB;
  const feePct = meteoraPool.feePct / 100;

  const amountAfterFee = amountIn * (1 - feePct);
  const expectedOut = (amountAfterFee * B) / (A + amountAfterFee);
  const priceImpact = (amountIn / A) * 100;

  return {
    venue: "meteora",
    expectedOut,
    priceImpactPct: priceImpact,
    feePct: meteoraPool.feePct,
  };
}
