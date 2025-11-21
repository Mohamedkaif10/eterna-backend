
import { FastifyInstance } from "fastify";
import { getQueueStatusHandler } from "../controllers/queue.controller";

export default async function queueRoutes(fastify: FastifyInstance) {
  fastify.get("/api/queue/status", getQueueStatusHandler);
}