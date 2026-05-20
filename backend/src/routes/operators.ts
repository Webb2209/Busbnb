import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { generalLimiter, adminLoginLimiter } from '../middleware/rateLimiter';
import { issueTokens, setTokenCookies } from '../utils/authUtils';
import { sendNewOperatorNotification } from '../services/email.service';
import { logger } from '../utils/logger';
import { requireOperator } from '../middleware/operatorAuth';
import { ok, okDeleted } from '../utils/response';

const router = Router();

const signupSchema = z.object({
  companyName: z.string().min(2, 'Company name is too short'),
  contactName: z.string().min(2, 'Contact name is too short'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── POST /api/operators/signup ───────────────────────────────────────────────
router.post(
  '/signup',
  generalLimiter,
  asyncHandler(async (req, res) => {
    const { companyName, contactName, email, password } = signupSchema.parse(req.body);

    // 1. Check if email already exists
    const existingUser = await prisma.operatorUser.findUnique({ where: { email } });
    if (existingUser) {
      throw ApiError.badRequest('An account with this email already exists.');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Run inside a transaction to ensure both Company and OperatorUser are created
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
        },
      });

      const operator = await tx.operatorUser.create({
        data: {
          name: contactName,
          email,
          passwordHash,
          companyId: company.id,
        },
      });

      return { company, operator };
    });

    logger.info(`[Operator] New sign up: ${result.company.name} (${result.operator.email})`);

    // 4. Issue JWT tokens so they are instantly logged in
    const tokens = issueTokens(result.operator.id, result.operator.email);
    setTokenCookies(res, tokens);

    // 5. Send notification to platform admins
    await sendNewOperatorNotification(companyName, contactName, email);

    // 6. Return success
    ok(res, { operatorId: result.operator.id, companyId: result.company.id }, 201);
  }),
);

// ─── POST /api/operators/login ────────────────────────────────────────────────
router.post(
  '/login',
  adminLoginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const operator = await prisma.operatorUser.findUnique({
      where: { email },
      include: { company: true },
    });
    if (!operator) throw ApiError.unauthorized('Invalid email or password');

    const valid = await bcrypt.compare(password, operator.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    const tokens = issueTokens(operator.id, operator.email);
    setTokenCookies(res, tokens);

    // Return minimal profile so the frontend can hydrate the UI immediately
    ok(res, {
      operatorId: operator.id,
      name: operator.name,
      email: operator.email,
      companyId: operator.companyId,
      companyName: operator.company.name,
    });
  }),
);

// ─── GET /api/operators/me ────────────────────────────────────────────────────
router.get(
  '/me',
  requireOperator,
  asyncHandler(async (req, res) => {
    const operator = await prisma.operatorUser.findUnique({
      where: { id: req.operator!.userId },
      include: { company: true },
    });
    if (!operator) throw ApiError.unauthorized('Operator not found. Please log in again.');

    ok(res, {
      operatorId: operator.id,
      name: operator.name,
      email: operator.email,
      companyId: operator.companyId,
      companyName: operator.company.name,
      logoUrl: operator.company.logoUrl,
    });
  }),
);

// ─── POST /api/operators/logout ───────────────────────────────────────────────
router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    okDeleted(res);
  }),
);

export default router;
