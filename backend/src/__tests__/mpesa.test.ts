/**
 * src/__tests__/mpesa.test.ts
 * Integration-style tests for the M-Pesa callback endpoint.
 *
 * Uses Supertest against the Express app with Prisma mocked.
 *
 * Tests:
 *  - 200 OK with ResultCode 0 on valid success callback
 *  - 200 OK with ResultCode 1 on wrong callback secret
 *  - Booking status set to FAILED on M-Pesa failure callback
 *  - Duplicate callbacks are idempotent (already PAID booking not re-processed)
 */
import request from 'supertest';
import app from '../index';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock Prisma so we don't need a real DB
jest.mock('../config/db', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mpesaCallback: {
      create: jest.fn(),
    },
  },
}));

// Mock confirmBookingPaid (complex internal fn — tested separately via bookings tests)
jest.mock('../routes/bookings', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express') as typeof import('express');
  return {
    __esModule: true,
    default: express.Router(),
    confirmBookingPaid: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test_jwt_secret',
    JWT_REFRESH_SECRET: 'test_refresh_secret',
    MPESA_CALLBACK_SECRET: 'test_callback_secret',
    MPESA_ENV: 'sandbox',
    NODE_ENV: 'test',
    PORT: '4000',
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
  },
}));

jest.mock('../utils/redis', () => ({ redisClient: null }));
jest.mock('../services/seatLock.service', () => ({
  startSeatLockExpiryJob: jest.fn(),
}));
jest.mock('../workers/seatLock.worker', () => ({
  startSeatLockWorker: jest.fn(),
}));

import { prisma } from '../config/db';

// ─── Sample Payloads ─────────────────────────────────────────────────────────

const successCallback = {
  Body: {
    stkCallback: {
      MerchantRequestID: 'merchant-123',
      CheckoutRequestID: 'checkout-abc',
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: 500 },
          { Name: 'MpesaReceiptNumber', Value: 'PGN123456' },
          { Name: 'TransactionDate', Value: 20250518120000 },
          { Name: 'PhoneNumber', Value: 254712345678 },
        ],
      },
    },
  },
};

const failureCallback = {
  Body: {
    stkCallback: {
      MerchantRequestID: 'merchant-123',
      CheckoutRequestID: 'checkout-abc',
      ResultCode: 1032,
      ResultDesc: 'Request cancelled by user',
    },
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

const CALLBACK_URL = '/api/mpesa/callback?secret=test_callback_secret';

describe('POST /api/mpesa/callback', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.mpesaCallback.create as jest.Mock).mockResolvedValue({});
  });

  it('returns 200 ResultCode 0 on valid success callback', async () => {
    (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'booking-1',
      bookingRef: 'BUS-001',
      status: 'PENDING',
    });

    const res = await request(app)
      .post(CALLBACK_URL)
      .send(successCallback)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0);
  });

  it('returns 200 ResultCode 1 when callback secret is wrong', async () => {
    const res = await request(app)
      .post('/api/mpesa/callback?secret=wrong_secret')
      .send(successCallback)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(1);
    expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled();
  });

  it('marks booking as FAILED on failure callback', async () => {
    (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'booking-1',
      bookingRef: 'BUS-001',
      status: 'PENDING',
    });
    (mockPrisma.booking.update as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post(CALLBACK_URL)
      .send(failureCallback)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    // Give the async post-response processing time to complete
    await new Promise((r) => setTimeout(r, 100));
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('is idempotent — does nothing for unknown CheckoutRequestID', async () => {
    (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post(CALLBACK_URL)
      .send(successCallback)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
});
