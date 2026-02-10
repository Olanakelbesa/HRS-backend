import { createClient } from 'redis';
import { env } from './env';

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    // Avoid reconnection spam when Redis is not running (e.g. local dev)
    reconnectStrategy: () => false,
  },
});

redisClient.on('error', (err) => {
  if (env.NODE_ENV === 'production') console.error('Redis Client Error', err);
});

let connected = false;

(async () => {
  try {
    await redisClient.connect();
    connected = true;
    console.log('⚡ Redis Connected');
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      console.warn('⚠ Redis unavailable (ECONNREFUSED). Running without cache. Start Redis for caching.');
    } else {
      console.error('Redis connection failed:', err);
    }
  }
})();

export default redisClient;
export { connected as isRedisConnected };
