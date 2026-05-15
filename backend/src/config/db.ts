/**
 * src/config/db.ts
 * Prisma client singleton — safe to import anywhere.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // Allow reuse of the same instance across hot reloads in development
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
