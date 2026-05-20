/**
 * src/routes/admin/buses.ts
 * CRUD for buses.
 */
import { Router } from 'express';
import { z } from 'zod';
import { Layout } from '@prisma/client';
import { prisma } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { ok, okDeleted } from '../../utils/response';

const router = Router();

const busSchema = z.object({
  plateNumber: z.string().min(3),
  capacity: z.number().int().min(1).max(100),
  layout: z.nativeEnum(Layout),
  amenities: z.array(z.string()).default([]),
  companyId: z.string().min(1),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const buses = await prisma.bus.findMany({
      orderBy: { plateNumber: 'asc' },
      include: { company: true },
    });
    ok(res, buses);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = busSchema.parse(req.body);
    const bus = await prisma.bus.create({ data, include: { company: true } });
    ok(res, bus, 201);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.bus.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Bus not found');

    const data = busSchema.partial().parse(req.body);
    const bus = await prisma.bus.update({
      where: { id: req.params.id },
      data,
      include: { company: true },
    });
    ok(res, bus);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.bus.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Bus not found');

    await prisma.bus.delete({ where: { id: req.params.id } });
    okDeleted(res);
  }),
);

export default router;
