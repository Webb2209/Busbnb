/**
 * src/services/seatLock.service.ts
 * Manages temporary seat locks during the booking flow.
 *
 * Flow:
 *  1. User selects seats → POST /api/trips/:id/lock-seats
 *  2. Seats marked LOCKED; lockToken (signed JWT with unique JTI) returned to client
 *  3. Client sends lockToken with POST /api/bookings
 *  4. Service verifies token, checks JTI has not been used, then marks JTI used in Redis
 *  5. Cron job runs every 2 min and resets expired LOCKED seats → AVAILABLE
 */
import { SeatStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/redis';

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const LOCK_DURATION_SEC = 10 * 60;        // Redis TTL in seconds

// Only instantiate Queue if we have a valid Redis connection
let seatLockQueue: Queue | null = null;

export function startSeatLockExpiryJob() {
  if (seatLockQueue) return; // Already initialized

  if (redisClient) {
    seatLockQueue = new Queue('seat-lock-expiry', { connection: redisClient as any });

    seatLockQueue.add('expire-seats', {}, {
      repeat: {
        // Run every 2 minutes — aligns with the 10-min lock window so seats release promptly.
        // Previously was */5 which could leave seats locked 5 min past expiry.
        pattern: '*/2 * * * *',
      },
      removeOnComplete: true,
      removeOnFail: 10,
    }).catch(err => {
      logger.error({ err }, '[SeatLock] Failed to add repeat job to queue');
    });

    logger.info('[SeatLock] BullMQ expiry job scheduled (every 2 min)');
  } else {
    logger.warn('[SeatLock] Redis not configured, seat expiry queue NOT started');
  }
}

interface LockTokenPayload {
  jti: string;   // JWT ID — unique per token, used to prevent reuse
  tripId: string;
  seatIds: string[];
  ip: string;    // VULN-05 Fix: Bind lock to IP
}

// ─── Lock Seats ───────────────────────────────────────────────────────────────

export async function lockSeats(tripId: string, seatNumbers: string[], ip: string): Promise<string> {
  // Run in a transaction to prevent race conditions
  const lockedSeats = await prisma.$transaction(async (tx) => {
    // Fetch the seats and verify they are all AVAILABLE
    const seats = await tx.seat.findMany({
      where: { tripId, number: { in: seatNumbers } },
    });

    if (seats.length !== seatNumbers.length) {
      throw ApiError.badRequest('One or more seats were not found for this trip.', 'SEAT_NOT_FOUND');
    }

    const unavailable = seats.filter((s) => s.status !== SeatStatus.AVAILABLE);
    if (unavailable.length > 0) {
      const nums = unavailable.map((s) => s.number).join(', ');
      throw ApiError.conflict(`Seats ${nums} are no longer available.`, 'SEATS_UNAVAILABLE');
    }

    // Lock the seats
    const now = new Date();
    await tx.seat.updateMany({
      where: { id: { in: seats.map((s) => s.id) } },
      data: { status: SeatStatus.LOCKED, lockedAt: now },
    });

    return seats;
  });

  // Issue a signed lock token valid for 10 minutes.
  // jti (JWT ID) is a unique random UUID — stored in Redis on first use to prevent reuse.
  const payload: LockTokenPayload = {
    jti: crypto.randomUUID(),
    tripId,
    seatIds: lockedSeats.map((s) => s.id),
    ip,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '10m' });
  return token;
}

// ─── Unlock Seats ─────────────────────────────────────────────────────────────

export async function unlockSeats(tripId: string, seatNumbers: string[]): Promise<void> {
  await prisma.seat.updateMany({
    where: {
      tripId,
      number: { in: seatNumbers },
      status: SeatStatus.LOCKED,
    },
    data: { status: SeatStatus.AVAILABLE, lockedAt: null },
  });
}

// ─── Verify Lock Token ────────────────────────────────────────────────────────

/**
 * Verifies the lock token and marks its JTI as used in Redis.
 * Throws if:
 *  - Token is expired or invalid
 *  - IP does not match
 *  - JTI has already been used (prevents token reuse within the 10-min window)
 */
export async function verifyLockToken(token: string, currentIp: string): Promise<LockTokenPayload> {
  let payload: LockTokenPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET) as LockTokenPayload;
  } catch {
    throw ApiError.badRequest('Lock token is invalid or expired. Please re-select your seats.', 'LOCK_EXPIRED');
  }

  // IP binding check
  if (payload.ip !== currentIp) {
    logger.warn(`[SeatLock] IP mismatch: token bound to ${payload.ip}, request from ${currentIp}`);
    throw ApiError.badRequest('Lock token is invalid or expired. Please re-select your seats.', 'LOCK_EXPIRED');
  }

  // JTI reuse prevention — check if this token has already been used
  if (redisClient && payload.jti) {
    const redisKey = `lock_jti:${payload.jti}`;
    const alreadyUsed = await redisClient.get(redisKey);
    if (alreadyUsed) {
      logger.warn(`[SeatLock] Rejected reuse of lock token JTI: ${payload.jti}`);
      throw ApiError.badRequest('This seat lock has already been used. Please re-select your seats.', 'LOCK_REUSED');
    }
    // Mark the JTI as used for the remainder of the token's max TTL
    await redisClient.set(redisKey, '1', 'EX', LOCK_DURATION_SEC);
  }

  return payload;
}
