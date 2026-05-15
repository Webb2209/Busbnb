/**
 * src/services/seatLock.service.ts
 * Manages temporary seat locks during the booking flow.
 *
 * Flow:
 *  1. User selects seats → POST /api/trips/:id/lock-seats
 *  2. Seats marked LOCKED; lockToken (signed JWT) returned to client
 *  3. Client sends lockToken with POST /api/bookings
 *  4. Service verifies token before creating the booking
 *  5. Cron job runs every 2 min and resets expired LOCKED seats → AVAILABLE
 */
import { SeatStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/redis';

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Only instantiate Queue if we have a valid Redis connection
let seatLockQueue: Queue | null = null;

export function startSeatLockExpiryJob() {
  if (seatLockQueue) return; // Already initialized
  
  if (redisClient) {
    seatLockQueue = new Queue('seat-lock-expiry', { connection: redisClient as any });
    
    seatLockQueue.add('expire-seats', {}, {
      repeat: {
        pattern: '*/5 * * * *', // Run every 5 minutes
      },
      removeOnComplete: true,
      removeOnFail: 10,
    }).catch(err => {
      logger.error({ err }, '[SeatLock] Failed to add repeat job to queue');
    });
    
    logger.info('[SeatLock] BullMQ expiry job scheduled');
  } else {
    logger.warn('[SeatLock] Redis not configured, seat expiry queue NOT started');
  }
}

interface LockTokenPayload {
  tripId: string;
  seatIds: string[];
  ip: string; // VULN-05 Fix: Bind lock to IP
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

  // Issue a signed lock token valid for 10 minutes
  const payload: LockTokenPayload = {
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

export function verifyLockToken(token: string, currentIp: string): LockTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as LockTokenPayload;
    if (payload.ip !== currentIp) {
      throw new Error('IP mismatch');
    }
    return payload;
  } catch {
    throw ApiError.badRequest('Lock token is invalid or expired. Please re-select your seats.', 'LOCK_EXPIRED');
  }
}


