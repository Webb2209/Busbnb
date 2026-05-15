import Redis from 'ioredis';
import { env } from '../config/env';

// Export a single shared instance for caching and BullMQ
// BullMQ requires maxRetriesPerRequest: null
const redisOptions = { maxRetriesPerRequest: null };

// If no REDIS_URL is provided, we return undefined so the app degrades gracefully
// without caching and background jobs (useful for local dev without Docker).
export const redisClient = env.REDIS_URL ? new Redis(env.REDIS_URL, redisOptions) : undefined;
