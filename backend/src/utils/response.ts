/**
 * src/utils/response.ts
 * Typed response helpers — enforce a consistent { success, data, pagination }
 * shape across every route without relying on convention alone.
 */
import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Send a successful JSON response.
 * @example ok(res, { id: '123' })         → 200 { success: true, data: { id: '123' } }
 * @example ok(res, trip, 201)             → 201 { success: true, data: trip }
 */
export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data });
}

/**
 * Send a successful paginated JSON response.
 * @example okList(res, trips, { page: 1, limit: 12, total: 48, totalPages: 4 })
 */
export function okList(res: Response, data: unknown, pagination: PaginationMeta): void {
  res.status(200).json({ success: true, data, pagination });
}

/**
 * Send a successful response with no body (e.g. DELETE).
 */
export function okDeleted(res: Response): void {
  res.status(200).json({ success: true });
}
