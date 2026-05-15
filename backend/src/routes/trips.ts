/**
 * src/routes/trips.ts
 * Public trip endpoints — no auth required.
 *
 * GET  /api/trips          – Search/list trips
 * GET  /api/trips/:id      – Single trip with seat map
 * GET  /api/routes         – All unique routes (for search autocomplete)
 * POST /api/trips/:id/lock-seats    – Lock seats; returns lockToken
 * DELETE /api/trips/:id/lock-seats  – Release locks early
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { lockSeats, unlockSeats } from '../services/seatLock.service';
import { SeatStatus } from '@prisma/client';
import { seatLockLimiter } from '../middleware/rateLimiter';
import { redisClient } from '../utils/redis';

const router = Router();

// ─── GET /api/routes ──────────────────────────────────────────────────────────
router.get(
  '/routes',
  asyncHandler(async (_req, res) => {
    const routes = await prisma.route.findMany({
      orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
    });
    res.json({ success: true, data: routes });
  }),
);

// ─── GET /api/trips ───────────────────────────────────────────────────────────
const searchSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = searchSchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    // Date filter: if provided, match the departure day
    let dateFilter: { gte: Date; lt: Date } | undefined;
    if (query.date) {
      const start = new Date(query.date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      dateFilter = { gte: start, lt: end };
    }

    const where = {
      status: 'SCHEDULED' as const,
      ...(query.origin || query.destination
        ? {
            route: {
              ...(query.origin ? { origin: { contains: query.origin, mode: 'insensitive' as const } } : {}),
              ...(query.destination ? { destination: { contains: query.destination, mode: 'insensitive' as const } } : {}),
            },
          }
        : {}),
      ...(dateFilter ? { departureTime: dateFilter } : {}),
    };

    const cacheKey = `api:trips:${JSON.stringify(query)}`;
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { departureTime: 'asc' },
        include: {
          route: true,
          bus: { include: { company: true } },
          // Count available seats without loading all seat records
          _count: { select: { seats: { where: { status: SeatStatus.AVAILABLE } } } },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    const data = trips.map((t) => ({
      id: t.id,
      route: t.route,
      bus: {
        id: t.bus.id,
        plateNumber: t.bus.plateNumber,
        capacity: t.bus.capacity,
        layout: t.bus.layout,
        amenities: t.bus.amenities,
        company: t.bus.company,
      },
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      price: Number(t.price),
      availableSeats: t._count.seats,
      status: t.status,
    }));

    const responseData = {
      success: true,
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };

    if (redisClient) {
      // VULN-Ops Fix: Cache trip search results for 1 minute to handle traffic spikes
      await redisClient.set(cacheKey, JSON.stringify(responseData), 'EX', 60); 
    }

    res.json(responseData);
  }),
);

// ─── GET /api/trips/:id ───────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        route: true,
        bus: { include: { company: true } },
        seats: {
          orderBy: { number: 'asc' },
          select: { id: true, number: true, status: true },
        },
      },
    });

    if (!trip) throw ApiError.notFound('Trip not found');

    res.json({
      success: true,
      data: {
        id: trip.id,
        route: trip.route,
        bus: {
          id: trip.bus.id,
          plateNumber: trip.bus.plateNumber,
          capacity: trip.bus.capacity,
          layout: trip.bus.layout,
          amenities: trip.bus.amenities,
          company: trip.bus.company,
        },
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        price: Number(trip.price),
        status: trip.status,
        seats: trip.seats.map((s) => ({
          id: s.id,
          number: s.number,
          // Never expose LOCKED as a status to clients — show as locked from their POV
          status: s.status === 'AVAILABLE' ? 'available' : 'locked',
        })),
      },
    });
  }),
);

// ─── POST /api/trips/:id/lock-seats ──────────────────────────────────────────
const lockSchema = z.object({
  seats: z.array(z.string().min(1)).min(1).max(6),
});

router.post(
  '/:id/lock-seats',
  seatLockLimiter,
  asyncHandler(async (req, res) => {
    const { seats } = lockSchema.parse(req.body);

    // Verify the trip exists and is bookable
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) throw ApiError.notFound('Trip not found');
    if (trip.status !== 'SCHEDULED') throw ApiError.badRequest('This trip is no longer accepting bookings');

    const lockToken = await lockSeats(req.params.id, seats, req.ip || 'unknown');

    res.json({
      success: true,
      data: { lockToken, expiresIn: 600 }, // 600 seconds = 10 min
    });
  }),
);

// ─── DELETE /api/trips/:id/lock-seats ────────────────────────────────────────
const unlockSchema = z.object({
  seats: z.array(z.string().min(1)).min(1),
  lockToken: z.string().min(1), // VULN-06 Fix: Require token to unlock
});

router.delete(
  '/:id/lock-seats',
  asyncHandler(async (req, res) => {
    const { seats, lockToken } = unlockSchema.parse(req.body);
    
    // VULN-06 Fix: Verify ownership before unlocking
    const payload = verifyLockToken(lockToken, req.ip || 'unknown');
    if (payload.tripId !== req.params.id) throw ApiError.forbidden('Lock token does not match the requested trip');

    await unlockSeats(req.params.id, seats);
    res.json({ success: true });
  }),
);

export default router;
