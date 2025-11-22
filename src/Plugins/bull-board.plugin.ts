
import fp from 'fastify-plugin';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { orderQueue } from '../services/queue.service';

export default fp(async function bullBoardPlugin(fastify) {
  const serverAdapter = new FastifyAdapter();
  
  createBullBoard({
    queues: [new BullMQAdapter(orderQueue)],
    serverAdapter,
  });

  serverAdapter.setBasePath('/admin/queues');
  fastify.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });

  console.log('📊 Bull Board available at http://localhost:3000/admin/queues');
});