import { FastifyInstance } from "fastify";
import { getOrderHistoryHandler, getOrdersByStatusHandler } from "../controllers/history.controller";

export default async function historyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/history/orders", getOrderHistoryHandler);
  fastify.get("/api/history/orders/:status", getOrdersByStatusHandler);
}