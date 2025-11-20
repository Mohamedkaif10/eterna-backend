
import { DexQuote } from "../models/quote.model";
import { getRaydiumQuote } from "./dex/raydium.service";
import { getMeteoraQuote } from "./dex/meteora.service";

export async function findBestRoute(amount: number): Promise<DexQuote> {
  const raydium = getRaydiumQuote(amount);
  const meteora = getMeteoraQuote(amount);
  return raydium.expectedOut > meteora.expectedOut ? raydium : meteora;
}
