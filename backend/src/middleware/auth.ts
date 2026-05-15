/**
 * src/middleware/auth.ts
 * JWT guard for admin-only routes.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

interface AdminTokenPayload {
  adminId: string;
  email: string;
}

// Extend Express Request so downstream handlers can read req.admin
declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  let token = req.cookies?.accessToken;

  // Fallback to Authorization header for non-browser clients
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }

  if (!token) {
    return next(ApiError.unauthorized('Missing authentication token. Please log in.'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminTokenPayload;
    req.admin = payload;
    next();
  } catch {
    next(ApiError.unauthorized('Token is invalid or expired. Please log in again.'));
  }
}
