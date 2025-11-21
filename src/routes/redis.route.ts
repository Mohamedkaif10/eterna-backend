
import { FastifyInstance } from "fastify";
import { getActiveOrdersHandler } from "../controllers/redis.controller";

export default async function redisRoutes(fastify: FastifyInstance) {
  fastify.get("/api/redis/active-orders", getActiveOrdersHandler);
}