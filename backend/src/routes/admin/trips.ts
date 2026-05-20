/**
 * src/routes/admin/trips.ts
 * Manage scheduled trips — create seats automatically on trip creation.
 *
 * GET    /api/admin/trips      – List all trips (paginated)
 * POST   /api/admin/trips      – Create trip (auto-generates seats)
 * PATCH  /api/admin/trips/:id  – Update trip status / price
 * DELETE /api/admin/trips/:id  – Cancel / delete trip
 *
 * GET    /api/admin/bookings          – List all bookings with filters
 * PATCH  /api/admin/bookings/:id      – Override booking status
 */
import { Router } from 'express';
import { z } from 'zod';
import { Layout, TripStatus, BookingStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { ok, okDeleted, okList } from '../../utils/response';

const router = Router();

// ─── Helper: generate seat numbers for a layout ───────────────────────────────
function buildSeats(layout: Layout, capacity: number): { number: string }[] {
  const letters = layout === Layout.TWO_BY_TWO ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
  const rows = layout === Layout.TWO_BY_TWO ? Math.ceil(capacity / 4) : Math.ceil(capacity / 3);
  const seats: { number: string }[] = [];
  for (let r = 1; r <= rows; r++) {
    for (const col of letters) {
      seats.push({ number: `${r}${col}` });
    }
  }
  return seats;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

const createTripSchema = z.object({
  routeId: z.string().min(1),
  busId: z.string().min(1),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  price: z.number().positive(),
});

router.get(
  '/trips',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { departureTime: 'desc' },
        include: {
          route: true,
          bus: { include: { company: true } },
          _count: { select: { seats: true, bookings: true } },
        },
      }),
      prisma.trip.count(),
    ]);

    okList(res, trips, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

router.post(
  '/trips',
  asyncHandler(async (req, res) => {
    const body = createTripSchema.parse(req.body);

    const bus = await prisma.bus.findUnique({ where: { id: body.busId } });
    if (!bus) throw ApiError.notFound('Bus not found');

    const seats = buildSeats(bus.layout, bus.capacity);

    const trip = await prisma.trip.create({
      data: {
        routeId: body.routeId,
        busId: body.busId,
        departureTime: new Date(body.departureTime),
        arrivalTime: new Date(body.arrivalTime),
        price: body.price,
        seats: { create: seats },
      },
      include: { route: true, bus: { include: { company: true } } },
    });

    ok(res, trip, 201);
  }),
);

router.patch(
  '/trips/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Trip not found');

    const schema = z.object({
      price: z.number().positive().optional(),
      status: z.nativeEnum(TripStatus).optional(),
      departureTime: z.string().datetime().optional(),
      arrivalTime: z.string().datetime().optional(),
    });

    const data = schema.parse(req.body);
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.departureTime ? { departureTime: new Date(data.departureTime) } : {}),
        ...(data.arrivalTime ? { arrivalTime: new Date(data.arrivalTime) } : {}),
      },
      include: { route: true, bus: { include: { company: true } } },
    });

    ok(res, trip);
  }),
);

router.delete(
  '/trips/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Trip not found');

    await prisma.trip.delete({ where: { id: req.params.id } });
    okDeleted(res);
  }),
);

// ─── Bookings (admin view) ────────────────────────────────────────────────────

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as BookingStatus | undefined;

    const where = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: { include: { route: true, bus: { include: { company: true } } } },
          seats: { include: { seat: { select: { number: true } } } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const mapped = bookings.map((b) => ({
      ...b,
      totalAmount: Number(b.totalAmount),
      seats: b.seats.map((bs) => bs.seat.number),
    }));
    okList(res, mapped, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

router.patch(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Booking not found');

    const schema = z.object({
      status: z.nativeEnum(BookingStatus),
      mpesaRef: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
    });

    ok(res, { ...booking, totalAmount: Number(booking.totalAmount) });
  }),
);

export default router;
