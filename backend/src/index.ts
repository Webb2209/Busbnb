/**
 * src/index.ts
 * BusBnB Backend — Express entry point.
 */
import './config/env'; // Validate env vars first — exits if invalid
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { requireAdmin } from './middleware/auth';
import { requireOperator } from './middleware/operatorAuth';
import { startSeatLockExpiryJob } from './services/seatLock.service';
import { startSeatLockWorker } from './workers/seatLock.worker';

import tripsRouter from './routes/trips';
import publicRoutesRouter from './routes/publicRoutes';
import bookingsRouter from './routes/bookings';
import mpesaRouter from './routes/mpesa';
import adminAuthRouter from './routes/admin/auth';
import adminCompaniesRouter from './routes/admin/companies';
import adminBusesRouter from './routes/admin/buses';
import adminRoutesRouter from './routes/admin/routes';
import adminTripsRouter from './routes/admin/trips';
import operatorsRouter from './routes/operators';
import operatorRoutesRouter from './routes/operatorRoutes';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.set('trust proxy', 1); // VULN-01 Fix: Trust only the first proxy (Nginx/Cloudflare)
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// VULN-02/Ops Fix: Structured request logging
app.use(pinoHttp({ logger }));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ─── Public Routes ────────────────────────────────────────────────────────────
app.use('/api/trips', tripsRouter);
app.use('/api/routes', publicRoutesRouter);  // GET /api/routes — origin/destination autocomplete
app.use('/api/bookings', bookingsRouter);
app.use('/api/mpesa', mpesaRouter);

// Operator Routes
app.use('/api/operators', operatorsRouter);
app.use('/api/operators/routes', requireOperator, operatorRoutesRouter);

// ─── Admin Routes (JWT protected) ─────────────────────────────────────────────
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/companies', requireAdmin, adminCompaniesRouter);
app.use('/api/admin/buses', requireAdmin, adminBusesRouter);
app.use('/api/admin/routes', requireAdmin, adminRoutesRouter);
app.use('/api/admin', requireAdmin, adminTripsRouter); // covers /trips and /bookings

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(env.PORT) || 4000;

app.listen(PORT, () => {
  logger.info(`\n🚌 BusBnB API running on http://localhost:${PORT}`);
  logger.info(`   Environment : ${env.NODE_ENV}`);
  logger.info(`   Frontend URL: ${env.FRONTEND_URL}`);
  logger.info(`   M-Pesa env  : ${env.MPESA_ENV}\n`);

  // Start the seat lock expiry cron job scheduling
  startSeatLockExpiryJob();
  
  // Start the worker to process the jobs
  startSeatLockWorker();
});

export default app;
