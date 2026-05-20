/**
 * src/routes/operatorRoutes.ts
 * Operator-scoped route management.
 *
 * GET  /api/operators/routes  – List all routes (for trip scheduling dropdowns)
 * POST /api/operators/routes  – Create a new origin→destination pair
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { requireOperator } from '../middleware/operatorAuth';
import { redisClient } from '../utils/redis';
import { ok } from '../utils/response';

const router = Router();

const routeSchema = z.object({
  origin: z.string().min(2, 'Origin must be at least 2 characters'),
  destination: z.string().min(2, 'Destination must be at least 2 characters'),
});

// All operator route endpoints require authentication
router.use(requireOperator);

// GET /api/operators/routes
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const routes = await prisma.route.findMany({
      orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
      include: {
        _count: { select: { trips: true } },
      },
    });
    ok(res, routes);
  }),
);

// POST /api/operators/routes
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = routeSchema.parse(req.body);

    // Normalise capitalisation (e.g. "nairobi" → "Nairobi")
    const origin = data.origin.trim();
    const destination = data.destination.trim();

    if (origin.toLowerCase() === destination.toLowerCase()) {
      throw ApiError.badRequest('Origin and destination cannot be the same');
    }

    const existing = await prisma.route.findUnique({
      where: { origin_destination: { origin, destination } },
    });
    if (existing) throw ApiError.conflict('This route already exists');

    const route = await prisma.route.create({
      data: { origin, destination },
      include: { _count: { select: { trips: true } } },
    });

    // Bust the public routes cache so autocomplete reflects the new route immediately
    if (redisClient) {
      await redisClient.del('api:routes');
    }

    ok(res, route, 201);
  }),
);

export default router;
