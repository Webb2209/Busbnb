/**
 * src/routes/admin/routes.ts
 * CRUD for bus routes (origin → destination pairs).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { redisClient } from '../../utils/redis';

const router = Router();

const routeSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const routes = await prisma.route.findMany({
      orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
    });
    res.json({ success: true, data: routes });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = routeSchema.parse(req.body);

    // Enforce uniqueness (Prisma will throw a unique constraint error anyway, but nicer UX)
    const existing = await prisma.route.findUnique({
      where: { origin_destination: { origin: data.origin, destination: data.destination } },
    });
    if (existing) throw ApiError.conflict('This route already exists');

    const route = await prisma.route.create({ data });

    // Bust public routes cache
    if (redisClient) await redisClient.del('api:routes');

    res.status(201).json({ success: true, data: route });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.route.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Route not found');

    const data = routeSchema.partial().parse(req.body);

    // Check uniqueness if both fields are being updated
    if (data.origin && data.destination) {
      const conflict = await prisma.route.findUnique({
        where: { origin_destination: { origin: data.origin, destination: data.destination } },
      });
      if (conflict && conflict.id !== req.params.id) {
        throw ApiError.conflict('A route with this origin and destination already exists');
      }
    }

    const route = await prisma.route.update({ where: { id: req.params.id }, data });

    if (redisClient) await redisClient.del('api:routes');

    res.json({ success: true, data: route });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.route.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Route not found');

    const tripCount = await prisma.trip.count({ where: { routeId: req.params.id } });
    if (tripCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete: this route has ${tripCount} associated trip(s). Cancel or reassign them first.`,
      );
    }

    await prisma.route.delete({ where: { id: req.params.id } });

    if (redisClient) await redisClient.del('api:routes');

    res.json({ success: true });
  }),
);

export default router;
