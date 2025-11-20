import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { WebSocket } from "ws"; 

export default fp(async function websocketPlugin(fastify: FastifyInstance) {
  fastify.register(websocket);

  const clients = new Map<string, Set<WebSocket>>();

  fastify.decorate("wsBroadcast", (orderId: string, message: any) => {
    const group = clients.get(orderId);
    if (!group) return;

    const json = JSON.stringify(message);

    group.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    });
  });

  fastify.decorate("wsRegister", (orderId: string, socket: WebSocket) => {
    if (!clients.has(orderId)) clients.set(orderId, new Set());
    clients.get(orderId)!.add(socket);

    socket.on("close", () => {
      clients.get(orderId)?.delete(socket);
    });
  });
});
