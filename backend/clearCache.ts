import { redisClient } from './src/utils/redis';

async function clear() {
  if (redisClient) {
    try {
      await redisClient.flushall();
      console.log('Cache cleared successfully!');
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    process.exit(0);
  } else {
    console.log('No redis client configured.');
    process.exit(0);
  }
}
clear();
