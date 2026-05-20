/**
 * src/routes/mpesa.ts
 * POST /api/mpesa/callback — Safaricom Daraja webhook.
 *
 * Safaricom POSTs here after the user enters their M-Pesa PIN.
 * This endpoint MUST be a public HTTPS URL. Use ngrok in development.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { parseMpesaCallback } from '../services/mpesa.service';
import { confirmBookingPaid } from './bookings';
import { BookingStatus } from '@prisma/client';
import { mpesaCallbackLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { isInCidr } from '../utils/cidr';
import type { SafaricomCallbackBody } from '../types/mpesa';

const router = Router();

/**
 * Safaricom's documented production callback IP ranges (CIDR notation).
 * Source: https://developer.safaricom.co.ke/Documentation
 * Updated: 2025-01
 */
const SAFARICOM_CIDRS = [
  '196.201.214.0/24',
  '196.201.213.0/24',
  '196.201.212.0/24',
  '196.201.211.0/24',
  '196.201.210.0/24',
  '196.201.209.0/24',
];

const safaricomIpWhitelist = (req: Request, res: Response, next: NextFunction) => {
  // Skip IP filtering in sandbox mode (ngrok/local dev callbacks come from arbitrary IPs)
  if (process.env.MPESA_ENV === 'sandbox') return next();

  // Prefer X-Forwarded-For (set by reverse proxy), fall back to socket address
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  // X-Forwarded-For may be comma-separated; take the first (leftmost = client)
  const ip = (Array.isArray(rawIp) ? rawIp[0] : rawIp).split(',')[0].trim();

  if (isInCidr(ip, SAFARICOM_CIDRS)) {
    return next();
  }

  logger.warn(`[Security] Blocked M-Pesa callback from unauthorized IP: ${ip}`);
  return res.status(403).json({ error: 'Unauthorized IP' });
};

router.post(
  '/callback',
  mpesaCallbackLimiter,
  safaricomIpWhitelist,
  asyncHandler(async (req, res) => {
    // Verify the shared secret from the query string
    if (env.MPESA_CALLBACK_SECRET && req.query.secret !== env.MPESA_CALLBACK_SECRET) {
      logger.warn('[Security] Rejected M-Pesa callback: Invalid or missing secret');
      // Return 200 so Safaricom stops retrying
      return res.status(200).json({ ResultCode: 1, ResultDesc: 'Rejected' });
    }

    // Always respond 200 to Safaricom immediately, even on errors
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    // Parse the callback payload
    const parsed = parseMpesaCallback(req.body as SafaricomCallbackBody);

    if (!parsed.checkoutRequestId) {
      logger.error({ body: req.body }, '[M-Pesa] Callback missing CheckoutRequestID');
      return;
    }

    // Look up the booking securely using the unique checkoutRequestId
    const booking = await prisma.booking.findUnique({
      where: { checkoutRequestId: parsed.checkoutRequestId },
    });

    if (!booking) {
      logger.error(`[M-Pesa] No booking found for CheckoutRequestID: ${parsed.checkoutRequestId}`);
      return;
    }

    // Store the raw payload for audit
    await prisma.mpesaCallback.create({
      data: {
        bookingId: booking.id,
        rawPayload: req.body,
      },
    });

    if (!parsed.success) {
      // Payment failed or cancelled by user
      await prisma.booking.update({
        where: { id: booking.id, status: BookingStatus.PENDING },
        data: { status: BookingStatus.FAILED },
      });
      logger.info(`[M-Pesa] Payment failed for booking ${booking.bookingRef}: ${parsed.resultDesc}`);
      return;
    }

    // Payment succeeded — confirm the booking and send the ticket email
    logger.info(`[M-Pesa] Payment confirmed for ${booking.bookingRef} (${parsed.mpesaRef})`);
    await confirmBookingPaid(booking.bookingRef, parsed.mpesaRef!);
  }),
);

export default router;
