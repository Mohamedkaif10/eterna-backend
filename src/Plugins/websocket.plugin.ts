
import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";


let broadcastFn: ((orderId: string, message: any) => void) | null = null;
let registerFn: ((orderId: string, socket: WebSocket) => void) | null = null;

const connectionWaiters = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();

export function wsBroadcast(orderId: string, message: any) {
  if (broadcastFn) {
    console.log(` Broadcasting to ${orderId}:`, message);
    broadcastFn(orderId, message);
  } else {
    console.warn('WebSocket broadcast not initialized yet');
  }
}

export function wsRegister(orderId: string, socket: WebSocket) {
  if (registerFn) {
    console.log(`WebSocket registered for order: ${orderId}`);
    registerFn(orderId, socket);
    

    const waiter = connectionWaiters.get(orderId);
    if (waiter) {
      waiter.resolve();
      connectionWaiters.delete(orderId);
    }
  } else {
    console.warn('WebSocket register not initialized yet');
  }
}

export function waitForWebSocketConnection(orderId: string, timeout = 5000): Promise<void> {
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


  const clients = new Map<string, Set<WebSocket>>();


  broadcastFn = (orderId: string, message: any) => {
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
  };


  registerFn = (orderId: string, socket: WebSocket) => {
    if (!clients.has(orderId)) {
      clients.set(orderId, new Set());
    }
    clients.get(orderId)!.add(socket);

    console.log(`🔗 New WebSocket connection for order: ${orderId}, total clients: ${clients.get(orderId)!.size}`);

    socket.on("close", () => {
      clients.get(orderId)?.delete(socket);
      console.log(`🔌 WebSocket disconnected for order: ${orderId}`);
    });

    socket.on("error", (error) => {
      console.error(`💥 WebSocket error for order ${orderId}:`, error);
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