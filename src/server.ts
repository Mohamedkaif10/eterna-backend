import Fastify from "fastify";
import ordersRoutes from "./routes/orders.routes";
import websocketPlugin from "./Plugins/websocket.plugin";

const fastify = Fastify({ logger: true });
fastify.register(ordersRoutes);
fastify.register(websocketPlugin);

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    fastify.log.info(`Server listening on ${fastify.server.address()}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
