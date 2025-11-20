export type Side = "buy" | "sell";

export interface CreateOrderPayload {
  baseToken: string;
  quoteToken: string;
  side: Side;
  amount: number;
  slippagePct?: number | undefined;
  clientId?: string | undefined; 
}


export enum OrderStatus {
  CREATED = "created",
  ACCEPTED = "accepted",
  ROUTED = "routed",
  SUBMITTED = "submitted",
  FILLED = "filled",
  PARTIAL = "partial_filled",
  FAILED = "failed",
}

export interface Fill {
  poolId: string;
  amountIn: number;
  amountOut: number;
  timestamp: string;
}

export interface Order {
  id: string;
  type: "market"; // MVP only market
  side: Side;
  baseToken: string;
  quoteToken: string;
  amount: number;
  slippagePct: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  fills: Fill[];
 clientId?: string; 
  // optional: metadata for routing/estimates
  meta?: Record<string, unknown>;
}
