
import Fastify from "fastify";
import ordersRoutes from "./routes/orders.routes";
import websocketPlugin from "./plugins/websocket.plugin.js";
import bullBoardPlugin from "./plugins/bull-board.plugin.js";
import queueRoutes from './routes/queue.route';
import { initDatabase } from './config/database';
import historyRoutes from './routes/history.routes';
const fastify = Fastify({ logger: true });

fastify.register(websocketPlugin);
fastify.register(bullBoardPlugin);

fastify.register(ordersRoutes);
fastify.register(queueRoutes);  
fastify.register(historyRoutes);

const start = async () => {
  try {
    await initDatabase();
    fastify.log.info("Database connected successfully");
    await fastify.listen({ port: 3000 });
    fastify.log.info(`Server listening on http://localhost:3000`);
      fastify.log.info(`Bull Board at http://localhost:3000/admin/queues`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
