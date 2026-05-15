/**
 * src/routes/publicRoutes.ts
 * GET /api/routes — returns all unique origin/destination pairs for autocomplete.
 */
import { Router } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';

import { redisClient } from '../utils/redis';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    // VULN-Ops Fix: Cache the routes since they rarely change
    const cacheKey = 'api:routes';
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const routes = await prisma.route.findMany({
      orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
    });
    
    const responseData = { success: true, data: routes };
    
    if (redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(responseData), 'EX', 24 * 60 * 60); // Cache for 24h
    }

    res.json(responseData);
  }),
);

export default router;
