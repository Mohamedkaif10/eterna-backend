
import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { WebSocket } from "ws"; 

export default fp(async function websocketPlugin(fastify: FastifyInstance) {
  console.log('🔵 Registering WebSocket plugin...');
  
  await fastify.register(websocket);
  console.log('✅ WebSocket plugin registered');

  const clients = new Map<string, Set<WebSocket>>();

  fastify.decorate("wsBroadcast", (orderId: string, message: any) => {
    console.log(`📤 Broadcasting to order ${orderId}:`, message);
    const group = clients.get(orderId);
    if (!group) {
      console.log(`❌ No clients found for order ${orderId}`);
      return;
    }

    const json = JSON.stringify(message);
    console.log(`📤 Sending to ${group.size} clients`);

    group.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    });
  });

  fastify.decorate("wsRegister", (orderId: string, socket: WebSocket) => {
    console.log(`🔵 Registering WebSocket for order: ${orderId}`);
    
    if (!clients.has(orderId)) {
      clients.set(orderId, new Set());
      console.log(`✅ Created new client group for order: ${orderId}`);
    }
    
    clients.get(orderId)!.add(socket);
    console.log(`✅ WebSocket registered. Total clients for ${orderId}: ${clients.get(orderId)!.size}`);

    socket.on("close", () => {
      console.log(`🔴 Removing WebSocket for order: ${orderId}`);
      clients.get(orderId)?.delete(socket);
    });
  });

  console.log('✅ Custom WebSocket methods decorated');
});