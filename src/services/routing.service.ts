
import { DexQuote } from "../models/quote.model";
import { getRaydiumQuote } from "./dex/raydium.service";
import { getMeteoraQuote } from "./dex/meteora.service";

export async function findBestRoute(amount: number) {
  const raydium = getRaydiumQuote(amount);
  const meteora = getMeteoraQuote(amount);

  console.log(`
[Routing Decision]
Raydium => ${raydium.expectedOut.toFixed(6)}
Meteora => ${meteora.expectedOut.toFixed(6)}
Selected => ${raydium.expectedOut > meteora.expectedOut ? "Raydium" : "Meteora"}
  `);

  return {
    best: raydium.expectedOut > meteora.expectedOut ? raydium : meteora,
    routingLog: {
      raydium,
      meteora,
      chosen: raydium.expectedOut > meteora.expectedOut ? "raydium" : "meteora",
      timestamp: new Date().toISOString()
    }
  };
}
