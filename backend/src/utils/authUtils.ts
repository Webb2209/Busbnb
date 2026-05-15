import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

export function issueTokens(userId: string, email: string) {
  const accessOpts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const refreshOpts: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };

  const accessToken = jwt.sign({ userId, email }, env.JWT_SECRET, accessOpts);
  const refreshToken = jwt.sign({ userId, email }, env.JWT_REFRESH_SECRET, refreshOpts);
  return { accessToken, refreshToken };
}

export function setTokenCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  // 15 mins for access token
  res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  // 7 days for refresh token
  res.cookie('refreshToken', tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
