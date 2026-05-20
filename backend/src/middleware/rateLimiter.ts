/**
 * src/middleware/rateLimiter.ts
 * Rate limiters for sensitive endpoints.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Optional: Use Redis if available, otherwise fallback to memory store
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : undefined;
const store = redisClient ? new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any }) : undefined;

/** General API limiter — 100 requests per minute */
export const generalLimiter = rateLimit({
  store,
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

/** Booking creation — 3 per 10 minutes per IP/Phone (VULN-10 Fix) */
export const bookingLimiter = rateLimit({
  store,
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many booking attempts, please slow down.' },
  // Group limits by phone number (if provided in body) OR IP address to prevent STK push harassment
  keyGenerator: (req) => {
    // Group by phone number when available; fall back to IPv4/IPv6-safe IP key
    const phone = req.body?.passenger?.phone;
    return phone ? String(phone) : ipKeyGenerator(req.ip ?? '127.0.0.1');
  }
});

/** Admin login — 5 per 15 minutes per IP */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, please try again later.' },
});

/** M-Pesa callback — 200 per minute (Safaricom sends batches) */
export const mpesaCallbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded.' },
});

/** Seat Lock endpoint — Max 5 lock attempts per 10 minutes */
export const seatLockLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many lock attempts. Please try again later.' },
});
