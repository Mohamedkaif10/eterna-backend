import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";

const connectionWaiters = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
const clients = new Map<string, Set<WebSocket>>();

export function wsBroadcast(orderId: string, message: any) {
  const group = clients.get(orderId);
  if (!group) {
    console.log(`❌ No WebSocket clients found for orderId: ${orderId}`);
    return;
  }
  
  const json = JSON.stringify(message);
  let sentCount = 0;
  
  group.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
      sentCount++;
    } else {
      group.delete(ws);
    }
  });
  
  console.log(`📤 Sent to ${sentCount} clients for order ${orderId}`);
}

export function wsRegister(orderId: string, socket: WebSocket) {
  if (!clients.has(orderId)) {
    clients.set(orderId, new Set());
  }
  clients.get(orderId)!.add(socket);

  console.log(`🔗 New WebSocket connection for order: ${orderId}, total clients: ${clients.get(orderId)!.size}`);

  const waiter = connectionWaiters.get(orderId);
  if (waiter) {
    waiter.resolve();
    connectionWaiters.delete(orderId);
  }

  socket.on("close", () => {
    clients.get(orderId)?.delete(socket);
    console.log(`🔌 WebSocket disconnected for order: ${orderId}`);
  });

  socket.on("error", (error) => {
    console.error(`💥 WebSocket error for order ${orderId}:`, error);
    clients.get(orderId)?.delete(socket);
  });
}

export function waitForWebSocketConnection(orderId: string, timeout = 5000): Promise<void> {
  if (clients.has(orderId) && clients.get(orderId)!.size > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      connectionWaiters.delete(orderId);
      reject(new Error(`WebSocket connection timeout for order ${orderId}`));
    }, timeout);

    connectionWaiters.set(orderId, {
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });
  });
}

export default fp(async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(websocket);

  fastify.addHook('onClose', (instance, done) => {
    clients.forEach((sockets) => {
      sockets.forEach(socket => {
        socket.close();
      });
    });
    clients.clear();
    connectionWaiters.clear();
    done();
  });
});