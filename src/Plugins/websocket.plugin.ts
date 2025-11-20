import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";

let broadcastFn: ((orderId: string, message: any) => void) | null = null;
let registerFn: ((orderId: string, socket: WebSocket) => void) | null = null;

export function wsBroadcast(orderId: string, message: any) {
  if (broadcastFn) {
    broadcastFn(orderId, message);
  } else {
    console.warn('WebSocket broadcast not initialized yet');
  }
}

export function wsRegister(orderId: string, socket: WebSocket) {
  if (registerFn) {
    registerFn(orderId, socket);
  } else {
    console.warn('WebSocket register not initialized yet');
  }
}

export default fp(async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(websocket);

  const clients = new Map<string, Set<WebSocket>>();

  broadcastFn = (orderId: string, message: any) => {
    const group = clients.get(orderId);
    if (!group) {
      console.log(`No clients found for orderId: ${orderId}`);
      return;
    }
    
    const json = JSON.stringify(message);
    let sentCount = 0;
    
    group.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
        sentCount++;
      }
    });
    
    console.log(`Broadcast to ${sentCount} clients for order ${orderId}:`, message);
  };

  registerFn = (orderId: string, socket: WebSocket) => {
    if (!clients.has(orderId)) {
      clients.set(orderId, new Set());
    }
    clients.get(orderId)!.add(socket);

    console.log(`New WebSocket connection registered for order: ${orderId}`);

    socket.on("close", () => {
      clients.get(orderId)?.delete(socket);
      console.log(`WebSocket connection closed for order: ${orderId}`);
    });

    socket.on("error", (error) => {
      console.error(`WebSocket error for order ${orderId}:`, error);
      clients.get(orderId)?.delete(socket);
    });
  };

  fastify.addHook('onClose', (instance, done) => {
    clients.forEach((sockets) => {
      sockets.forEach(socket => {
        socket.close();
      });
    });
    clients.clear();
    done();
  });
});