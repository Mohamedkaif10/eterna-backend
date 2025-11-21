import IORedis from 'ioredis';

const redis = new IORedis({
  maxRetriesPerRequest: null
});

const ACTIVE_ORDERS_KEY = 'active_orders';
const ORDER_PREFIX = 'order:';

export async function saveOrderToRedis(order: any): Promise<void> {
  const orderKey = `${ORDER_PREFIX}${order.id}`;
  
  const storageObject: Record<string, string> = {
    ...order,
    amount: order.amount.toString(), 
    slippagePct: order.slippagePct.toString(),
    fills: JSON.stringify(order.fills || []), 
    clientId: order.clientId || '',
  };


  Object.keys(storageObject).forEach(key => {
    if (storageObject[key] === undefined || storageObject[key] === null) {
      delete storageObject[key];
    }
  });

  await redis
    .multi()
    .hset(orderKey, storageObject)
    .sadd(ACTIVE_ORDERS_KEY, order.id)
    .expire(orderKey, 86400) 
    .exec();
  
  console.log(`💾 Order ${order.id} saved to Redis`);
}

export async function getOrderFromRedis(orderId: string): Promise<any> {
  const orderKey = `${ORDER_PREFIX}${orderId}`;
  const orderData = await redis.hgetall(orderKey);
  
  if (!orderData || Object.keys(orderData).length === 0) {
    return null;
  }
  
  return {
    ...orderData,
  
    amount: parseFloat(orderData.amount || '0'), 
    slippagePct: parseFloat(orderData.slippagePct || '0'),
    
   
    fills: orderData.fills ? JSON.parse(orderData.fills) : [],
    
    createdAt: orderData.createdAt,
    updatedAt: orderData.updatedAt
  };
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const orderKey = `${ORDER_PREFIX}${orderId}`;
  
  await redis
    .multi()
    .hset(orderKey, 'status', status, 'updatedAt', new Date().toISOString())
    .exec();
  
  console.log(`🔄 Order ${orderId} status updated to: ${status}`);
}

export async function removeOrderFromActive(orderId: string): Promise<void> {
  await redis.srem(ACTIVE_ORDERS_KEY, orderId);
  console.log(`🗑️ Order ${orderId} removed from active orders`);
}

export async function getAllActiveOrders(): Promise<string[]> {
  return await redis.smembers(ACTIVE_ORDERS_KEY);
}

export async function getActiveOrdersCount(): Promise<number> {
  return await redis.scard(ACTIVE_ORDERS_KEY);
}

export async function isOrderActive(orderId: string): Promise<boolean> {
  return await redis.sismember(ACTIVE_ORDERS_KEY, orderId) === 1;
}