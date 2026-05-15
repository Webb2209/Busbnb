/**
 * src/routes/mpesa.ts
 * POST /api/mpesa/callback — Safaricom Daraja webhook.
 *
 * Safaricom POSTs here after the user enters their M-Pesa PIN.
 * This endpoint MUST be a public HTTPS URL. Use ngrok in development.
 */
import { Router } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { parseMpesaCallback } from '../services/mpesa.service';
import { confirmBookingPaid } from './bookings';
import { BookingStatus } from '@prisma/client';
import { mpesaCallbackLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const router = Router();

const safaricomIpWhitelist = (req: any, res: any, next: any) => {
  // In a real production environment, you would check req.ip against Safaricom's CIDRs.
  // For sandbox and ngrok, we skip IP filtering if MPESA_ENV=sandbox.
  if (process.env.MPESA_ENV === 'sandbox') return next();
  
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // Safaricom subnets: 196.201.214.*, 196.201.213.*, etc.
  if (typeof ip === 'string' && ip.startsWith('196.201.')) {
    return next();
  }
  
  logger.warn(`[Security] Blocked M-Pesa callback from unauthorized IP: ${ip}`);
  // Return 403 Forbidden
  return res.status(403).json({ error: 'Unauthorized IP' });
};

router.post(
  '/callback',
  mpesaCallbackLimiter,
  safaricomIpWhitelist,
  asyncHandler(async (req, res) => {
    // VULN-03 Fix: Verify the secret from the query string
    if (env.MPESA_CALLBACK_SECRET && req.query.secret !== env.MPESA_CALLBACK_SECRET) {
      logger.warn('[Security] Rejected M-Pesa callback: Invalid or missing secret');
      // Return 200 anyway so Safaricom stops retrying
      return res.status(200).json({ ResultCode: 1, ResultDesc: 'Rejected' });
    }

    // Always respond 200 to Safaricom immediately, even on errors
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    // Parse the callback payload
    const parsed = parseMpesaCallback(req.body);

    if (!parsed.checkoutRequestId) {
      logger.error({ body: req.body }, '[M-Pesa] Callback missing CheckoutRequestID');
      return;
    }

    // Look up the booking securely using the unique checkoutRequestId
    const booking = await prisma.booking.findUnique({ 
      where: { checkoutRequestId: parsed.checkoutRequestId } 
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
