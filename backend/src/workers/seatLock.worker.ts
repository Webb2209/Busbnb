import { Worker, ConnectionOptions } from 'bullmq';
import { prisma } from '../config/db';
import { SeatStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/redis';

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function startSeatLockWorker() {
  if (!redisClient) {
    logger.warn('[SeatLock] Redis not configured, worker NOT started');
    return;
  }

  const worker = new Worker('seat-lock-expiry', async () => {
    try {
      const cutoff = new Date(Date.now() - LOCK_DURATION_MS);
      const result = await prisma.seat.updateMany({
        where: {
          status: SeatStatus.LOCKED,
          lockedAt: { lt: cutoff },
        },
        data: { status: SeatStatus.AVAILABLE, lockedAt: null },
      });

      if (result.count > 0) {
        logger.info(`[SeatLock] Released ${result.count} expired seat lock(s)`);
      }
    } catch (error) {
      logger.error({ error }, '[SeatLock] Worker encountered an error');
    }
  }, { connection: redisClient as ConnectionOptions });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Seat lock worker job failed');
  });

  logger.info('[SeatLock] BullMQ worker started for seat lock expiries');
}
