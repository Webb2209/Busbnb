/**
 * src/routes/admin/auth.ts
 * POST /api/admin/auth/login  – Returns JWT access + refresh tokens in HttpOnly cookies
 * POST /api/admin/auth/refresh – Refreshes access token from HttpOnly cookie
 * POST /api/admin/auth/logout – Clears HttpOnly cookies
 */
import { Router, type Response, type CookieOptions } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { adminLoginLimiter } from '../../middleware/rateLimiter';
import { issueTokens, setTokenCookies } from '../../utils/authUtils';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});



// POST /api/admin/auth/login
router.post(
  '/login',
  adminLoginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw ApiError.unauthorized('Invalid email or password');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    const tokens = issueTokens(admin.id, admin.email);
    setTokenCookies(res, tokens);
    
    // VULN-04 Fix: Do not return tokens in JSON body, rely on HttpOnly cookies
    res.json({ success: true });
  }),
);

// POST /api/admin/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // Read from cookie first, fallback to body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) throw ApiError.unauthorized('Refresh token missing');

    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
        email: string;
      };

      // Verify the admin still exists
      const admin = await prisma.adminUser.findUnique({ where: { id: payload.userId } });
      if (!admin) throw ApiError.unauthorized();

      const tokens = issueTokens(admin.id, admin.email);
      setTokenCookies(res, tokens);

      // VULN-04 Fix: Do not return tokens in JSON body
      res.json({ success: true });
    } catch {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      throw ApiError.unauthorized('Refresh token is invalid or expired. Please log in again.');
    }
  }),
);

// POST /api/admin/auth/logout
router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true });
  }),
);

export default router;
