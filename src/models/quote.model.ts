export interface DexQuote {
  venue: "raydium" | "meteora";
  expectedOut: number;
  priceImpactPct: number;
  feePct: number;
}
