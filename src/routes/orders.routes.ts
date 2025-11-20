import { FastifyInstance } from "fastify";
import { executeOrderHandler } from "../controllers/orders.controller";

export default async function ordersRoutes(fastify: FastifyInstance) {
  fastify.post("/api/orders/execute", executeOrderHandler);

  fastify.get(
    "/api/orders/updates/:orderId",
    { websocket: true },
    (socket, req) => { 
      const orderId = (req.params as { orderId: string }).orderId;
      (fastify as any).wsRegister(orderId, socket);

      // Optional welcome message - call send directly on socket
      socket.send(
        JSON.stringify({
          type: "connected",
          orderId,
          msg: "WebSocket live updates enabled",
        })
      );

      // Handle incoming messages from client
      socket.on('message', (message) => {
        console.log('Received message:', message.toString());
      });

      // Handle connection close
      socket.on('close', () => {
        console.log(`WebSocket connection closed for order ${orderId}`);
      });
    }
  );
}