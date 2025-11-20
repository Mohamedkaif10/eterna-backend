
import { FastifyInstance } from "fastify";
import { executeOrderHandler } from "../controllers/orders.controller";

export default async function ordersRoutes(fastify: FastifyInstance) {
  fastify.post("/api/orders/execute", executeOrderHandler);

  
  fastify.get(
    "/api/orders/updates/:orderId",
    { websocket: true },
    (socket, req) => { 
      console.log('WebSocket connection established!');
      
      const orderId = (req.params as { orderId: string }).orderId;
      console.log(`Connected to order: ${orderId}`);

      
      (fastify as any).wsRegister(orderId, socket);


      socket.send(
        JSON.stringify({
          type: "connected",
          orderId,
          msg: "WebSocket live updates enabled",
          timestamp: new Date().toISOString()
        })
      );


      socket.on('message', (message) => {
        console.log('Received message:', message.toString());
      });


      socket.on('close', () => {
        console.log(`WebSocket connection closed for order ${orderId}`);
      });


      socket.on('error', (error) => {
        console.error(` WebSocket error for order ${orderId}:`, error);
      });
    }
  );
}