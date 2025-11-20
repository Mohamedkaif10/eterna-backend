import { WebSocket } from "ws";

type BroadcastFn = (orderId: string, message: any) => void;
type RegisterFn = (orderId: string, socket: WebSocket) => void;

let broadcastFn: BroadcastFn | null = null;
let registerFn: RegisterFn | null = null;

export function setBroadcast(fn: BroadcastFn) {
  broadcastFn = fn;
}

export function setRegister(fn: RegisterFn) {
  registerFn = fn;
}

export function wsBroadcast(orderId: string, message: any) {
  if (!broadcastFn) return;
  broadcastFn(orderId, message);
}

export function wsRegister(orderId: string, socket: WebSocket) {
  if (!registerFn) return;
  registerFn(orderId, socket);
}
