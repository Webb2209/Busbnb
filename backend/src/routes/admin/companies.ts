/**
 * src/routes/admin/companies.ts
 * GET    /api/admin/companies      – List all companies
 * POST   /api/admin/companies      – Create company
 * PATCH  /api/admin/companies/:id  – Update company
 * DELETE /api/admin/companies/:id  – Delete company
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';

const router = Router();

const companySchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { buses: true } } },
    });
    res.json({ success: true, data: companies });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = companySchema.parse(req.body);
    const company = await prisma.company.create({ data });
    res.status(201).json({ success: true, data: company });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Company not found');

    const data = companySchema.partial().parse(req.body);
    const company = await prisma.company.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: company });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Company not found');

    await prisma.company.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

export default router;
