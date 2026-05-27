import redisClient from '../config/redis';

export async function getCache(key: string): Promise<any | null> {
  try {
    if (!redisClient.isOpen) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Cache get error for key ${key}:`, err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 3600): Promise<void> {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error(`Cache set error for key ${key}:`, err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.del(key);
  } catch (err) {
    console.error(`Cache del error for key ${key}:`, err);
  }
}
