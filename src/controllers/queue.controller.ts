
import { FastifyReply, FastifyRequest } from "fastify";
import { getQueueStatus } from "../services/queue.service";

export async function getQueueStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const status = await getQueueStatus();
    return reply.send(status);
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: "Failed to get queue status" });
  }
}