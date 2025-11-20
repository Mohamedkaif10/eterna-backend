
import { FastifyInstance } from "fastify";
import { executeOrderHandler } from "../controllers/orders.controller";
import { wsRegister } from "../plugins/websocket.plugin"; 

export default async function ordersRoutes(fastify: FastifyInstance) {
  fastify.post("/api/orders/execute", executeOrderHandler);

  fastify.get(
    "/api/orders/updates/:orderId",
    { websocket: true },
    (connection, req) => {
      const orderId = (req.params as { orderId: string }).orderId;
      
      console.log(`WebSocket connection established for order: ${orderId}`);
    
      wsRegister(orderId, connection);
      connection.send(
        JSON.stringify({
          type: "connected",
          orderId,
          msg: "WebSocket live updates enabled",
          timestamp: new Date().toISOString()
        })
      );
      connection.on('message', (message) => {
        console.log(`Received message from client for order ${orderId}:`, message.toString());
      });

      connection.on('error', (error) => {
        console.error(`WebSocket error for order ${orderId}:`, error);
      });

      connection.on('close', () => {
        console.log(`WebSocket connection closed for order: ${orderId}`);
      });
    }
  );
}