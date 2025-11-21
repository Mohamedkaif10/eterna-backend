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
  PENDING = "pending",
  ROUTING = "routing",
  BUILDING = "building",
  SUBMITTED = "submitted",
  CONFIRMED = "confirmed",
  PARTIAL = "partial_filled",
  FAILED = "failed",
  ROUTED = "routed",
  QUEUED = "QUEUED",
}

export interface Fill {
  pool: string;
  amountIn: number;
  amountOut: number;
  timestamp: string;
}

export interface Order {
  id: string;
  type: "market";
  side: Side;
  baseToken: string;
  quoteToken: string;
  amount: number;
  slippagePct: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  fills: Fill[];
  clientId?: string | undefined;
  meta?: Record<string, any>;
}
