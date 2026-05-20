/**
 * src/routes/bookings.ts
 * Booking endpoints.
 *
 * POST /api/bookings            – Create booking + trigger M-Pesa STK push
 * GET  /api/bookings/:bookingRef – Ticket lookup (polling-friendly)
 */
import { Router } from 'express';
import { z } from 'zod';
import { SeatStatus, BookingStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { verifyLockToken } from '../services/seatLock.service';
import { initiateStkPush } from '../services/mpesa.service';
import { sendTicketEmail } from '../services/email.service';
import { bookingLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { ok } from '../utils/response';

const router = Router();

// ─── POST /api/bookings ───────────────────────────────────────────────────────
const createBookingSchema = z.object({
  tripId: z.string().min(1),
  lockToken: z.string().min(1, 'lockToken is required — please select seats first'),
  passenger: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z
      .string()
      .regex(/^(07|01)\d{8}$/, 'Enter a valid Safaricom number (e.g. 0712345678)'),
  }),
});

router.post(
  '/',
  bookingLimiter,
  asyncHandler(async (req, res) => {
    const { tripId, lockToken, passenger } = createBookingSchema.parse(req.body);

    // 1. Verify the lock token — checks IP binding and JTI reuse in Redis
    const lockPayload = await verifyLockToken(lockToken, req.ip || 'unknown');
    if (lockPayload.tripId !== tripId) {
      throw ApiError.badRequest('Lock token does not match the requested trip', 'TOKEN_MISMATCH');
    }

    // 2. Fetch the trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { route: true, bus: { include: { company: true } } },
    });
    if (!trip) throw ApiError.notFound('Trip not found');
    if (trip.status !== 'SCHEDULED') throw ApiError.badRequest('This trip is no longer accepting bookings');

    // 3. Fetch the locked seats and verify they are still LOCKED
    const seats = await prisma.seat.findMany({
      where: { id: { in: lockPayload.seatIds }, tripId, status: SeatStatus.LOCKED },
    });

    if (seats.length !== lockPayload.seatIds.length) {
      throw ApiError.conflict(
        'One or more seats are no longer locked. Please go back and re-select your seats.',
        'LOCKS_EXPIRED',
      );
    }

    const totalAmount = Number(trip.price) * seats.length;

    // 4. Create the booking in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Mark seats as BOOKED
      await tx.seat.updateMany({
        where: { id: { in: seats.map((s) => s.id) } },
        data: { status: SeatStatus.BOOKED, lockedAt: null },
      });

      // Create the booking record
      return tx.booking.create({
        data: {
          tripId,
          fullName: passenger.fullName,
          email: passenger.email,
          phone: passenger.phone,
          totalAmount,
          status: BookingStatus.PENDING,
          seats: {
            create: seats.map((s) => ({ seatId: s.id })),
          },
        },
      });
    });

    // 5. Trigger M-Pesa STK push (non-blocking on credential error)
    try {
      const stkResult = await initiateStkPush({
        phone: passenger.phone,
        amount: totalAmount,
        bookingRef: booking.bookingRef,
      });

      if (stkResult && stkResult.CheckoutRequestID) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { checkoutRequestId: stkResult.CheckoutRequestID },
        });
      }
    } catch (err) {
      logger.error({ err }, '[M-Pesa] STK push failed');
      // Don't fail the booking — frontend will poll and timeout
    }

    ok(res, {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      status: booking.status,
      totalAmount: Number(booking.totalAmount),
    }, 201);
  }),
);

// ─── GET /api/bookings/:bookingRef ────────────────────────────────────────────
router.get(
  '/:bookingRef',
  asyncHandler(async (req, res) => {
    // VULN-07 Fix: Require email query parameter to prevent PII enumeration
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      throw ApiError.badRequest('Email parameter is required to view booking');
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingRef: req.params.bookingRef },
      include: {
        trip: {
          include: {
            route: true,
            bus: { include: { company: true } },
          },
        },
        seats: {
          include: { seat: { select: { number: true } } },
        },
      },
    });

    if (!booking) throw ApiError.notFound('Booking not found');
    
    // VULN-07 Fix: Verify email matches the booking
    if (booking.email.toLowerCase() !== email.toLowerCase()) {
      throw ApiError.forbidden('Email does not match this booking');
    }

    ok(res, {
      id: booking.id,
      bookingRef: booking.bookingRef,
      status: booking.status,
      mpesaRef: booking.mpesaRef,
      totalAmount: Number(booking.totalAmount),
      createdAt: booking.createdAt,
      passenger: {
        fullName: booking.fullName,
        email: booking.email,
        phone: booking.phone,
      },
      seats: booking.seats.map((bs) => bs.seat.number),
      trip: {
        id: booking.trip.id,
        route: booking.trip.route,
        bus: {
          id: booking.trip.bus.id,
          plateNumber: booking.trip.bus.plateNumber,
          layout: booking.trip.bus.layout,
          amenities: booking.trip.bus.amenities,
          company: booking.trip.bus.company,
        },
        departureTime: booking.trip.departureTime,
        arrivalTime: booking.trip.arrivalTime,
        price: Number(booking.trip.price),
      },
    });
  }),
);

// ─── Helper: called by mpesa.ts after a successful callback ──────────────────
export async function confirmBookingPaid(
  bookingRef: string,
  mpesaRef: string,
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      trip: { include: { route: true, bus: { include: { company: true } } } },
      seats: { include: { seat: { select: { number: true } } } },
    },
  });

  if (!booking || booking.status !== BookingStatus.PENDING) return;

  await prisma.booking.update({
    where: { bookingRef },
    data: { status: BookingStatus.PAID, mpesaRef },
  });

  // Send ticket email (non-fatal if it fails)
  sendTicketEmail({
    to: booking.email,
    fullName: booking.fullName,
    bookingRef: booking.bookingRef,
    tripSummary: {
      origin: booking.trip.route.origin,
      destination: booking.trip.route.destination,
      departure: booking.trip.departureTime.toISOString(),
      operator: booking.trip.bus.company.name,
      seats: booking.seats.map((bs) => bs.seat.number),
      totalAmount: Number(booking.totalAmount),
    },
  }).catch((e) => logger.error({ err: e }, '[Email] Failed after payment confirmation'));
}

export default router;
