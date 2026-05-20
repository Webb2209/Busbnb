/**
 * src/__tests__/seatLock.test.ts
 * Unit tests for the seat lock token service.
 *
 * Tests:
 *  - Lock token can be verified with matching IP
 *  - Lock token is rejected for wrong IP
 *  - Lock token is rejected when expired
 *  - Lock token reuse is rejected (JTI invalidation)
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyLockToken } from '../services/seatLock.service';
import * as redis from '../utils/redis';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the Redis client so tests run without a real Redis instance
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('../utils/redis', () => ({
  redisClient: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
  },
}));

// Mock the env config
jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test_jwt_secret_for_unit_tests',
    NODE_ENV: 'test',
    PORT: '4000',
    FRONTEND_URL: 'http://localhost:3000',
    MPESA_ENV: 'sandbox',
    MPESA_CALLBACK_SECRET: 'test_callback_secret',
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_SECRET = 'test_jwt_secret_for_unit_tests';
const TEST_IP = '192.168.1.100';

function makeToken(overrides: Record<string, unknown> = {}, expiresIn = '10m') {
  const payload = {
    jti: crypto.randomUUID(),
    tripId: 'trip-123',
    seatIds: ['seat-1', 'seat-2'],
    ip: TEST_IP,
    ...overrides,
  };
  return jwt.sign(payload, TEST_SECRET, { expiresIn: expiresIn as any });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('verifyLockToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: JTI not yet used
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
  });

  it('returns the payload for a valid token with matching IP', async () => {
    const token = makeToken();
    const payload = await verifyLockToken(token, TEST_IP);

    expect(payload.tripId).toBe('trip-123');
    expect(payload.seatIds).toEqual(['seat-1', 'seat-2']);
    expect(mockRedisSet).toHaveBeenCalledTimes(1); // JTI stored as used
  });

  it('throws LOCK_EXPIRED if IP does not match', async () => {
    const token = makeToken({ ip: '10.0.0.1' });

    await expect(verifyLockToken(token, TEST_IP)).rejects.toMatchObject({
      code: 'LOCK_EXPIRED',
    });
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('throws LOCK_EXPIRED if token is expired', async () => {
    const token = makeToken({}, '-1s'); // Already expired

    await expect(verifyLockToken(token, TEST_IP)).rejects.toMatchObject({
      code: 'LOCK_EXPIRED',
    });
  });

  it('throws LOCK_REUSED if the JTI has already been used', async () => {
    const token = makeToken();
    // Simulate JTI already in Redis
    mockRedisGet.mockResolvedValue('1');

    await expect(verifyLockToken(token, TEST_IP)).rejects.toMatchObject({
      code: 'LOCK_REUSED',
    });
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('throws LOCK_EXPIRED for a tampered token', async () => {
    const token = makeToken() + 'tampered';

    await expect(verifyLockToken(token, TEST_IP)).rejects.toMatchObject({
      code: 'LOCK_EXPIRED',
    });
  });
});
