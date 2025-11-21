
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { startExecution } from './execution.services';
import { OrderStatus } from '../models/order.model';
import * as InMemStore from '../stores/inmem.store';
import * as RedisStore from '../stores/redis.store';
import { wsBroadcast } from '../plugins/websocket.plugin';

const connection = new IORedis({
  maxRetriesPerRequest: null
});

export const orderQueue = new Queue('order execution', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

export const worker = new Worker('order execution', async (job: Job) => {
  const { orderId } = job.data;
  
  console.log(`🚀 Processing order ${orderId} from queue`);
  
  try {
 
    await RedisStore.updateOrderStatus(orderId, OrderStatus.ACTIVE);
    
    await startExecution(orderId);
    
    await RedisStore.removeOrderFromActive(orderId);
    
    console.log(`✅ Order ${orderId} execution completed`);
    return { success: true, orderId };
  } catch (error) {
    console.error(`❌ Order ${orderId} execution failed:`, error);
    
    const order = InMemStore.getOrder(orderId);
    if (order) {
      order.status = OrderStatus.FAILED;
      order.updatedAt = new Date().toISOString();
      InMemStore.saveOrder(order);
      await RedisStore.updateOrderStatus(orderId, OrderStatus.FAILED);
    }
    
    throw error;
  }
}, {
  connection,
  limiter: {
    max: 100,
    duration: 60000
  },
  concurrency: 10
});

worker.on('completed', (job) => {
  console.log(`🎉 Job ${job.id} completed for order ${job.data.orderId}`);
});

worker.on('failed', (job, err) => {
  console.error(`💥 Job ${job?.id} failed for order ${job?.data.orderId}:`, err);
});

export async function addOrderToQueue(orderId: string): Promise<void> {
  await orderQueue.add('execute-order', { orderId }, {
    jobId: orderId,
    delay: 500
  });
  console.log(`📥 Order ${orderId} added to queue`);
}

export async function getQueueStatus(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  rateLimit: string;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    orderQueue.getWaiting(),
    orderQueue.getActive(),
    orderQueue.getCompleted(),
    orderQueue.getFailed()
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    rateLimit: "100 orders/minute"
  };
}