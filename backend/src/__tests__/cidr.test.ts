/**
 * src/__tests__/cidr.test.ts
 * Unit tests for the CIDR IP matching utility.
 * No DB or Redis required — pure logic tests.
 */
import { isInCidr } from '../utils/cidr';

const SAFARICOM_CIDRS = [
  '196.201.214.0/24',
  '196.201.213.0/24',
  '196.201.212.0/24',
  '196.201.211.0/24',
  '196.201.210.0/24',
  '196.201.209.0/24',
];

describe('isInCidr', () => {
  it('accepts an IP in a matched CIDR range', () => {
    expect(isInCidr('196.201.214.1', SAFARICOM_CIDRS)).toBe(true);
    expect(isInCidr('196.201.214.255', SAFARICOM_CIDRS)).toBe(true);
    expect(isInCidr('196.201.213.100', SAFARICOM_CIDRS)).toBe(true);
  });

  it('rejects an IP not in any CIDR range', () => {
    expect(isInCidr('196.201.215.1', SAFARICOM_CIDRS)).toBe(false);
    expect(isInCidr('10.0.0.1', SAFARICOM_CIDRS)).toBe(false);
    expect(isInCidr('127.0.0.1', SAFARICOM_CIDRS)).toBe(false);
    expect(isInCidr('0.0.0.0', SAFARICOM_CIDRS)).toBe(false);
  });

  it('handles IPv6-mapped IPv4 addresses (::ffff: prefix)', () => {
    expect(isInCidr('::ffff:196.201.214.5', SAFARICOM_CIDRS)).toBe(true);
    expect(isInCidr('::ffff:10.0.0.1', SAFARICOM_CIDRS)).toBe(false);
  });

  it('rejects non-IPv4 strings gracefully', () => {
    expect(isInCidr('not-an-ip', SAFARICOM_CIDRS)).toBe(false);
    expect(isInCidr('', SAFARICOM_CIDRS)).toBe(false);
  });

  it('handles /32 CIDR (single host)', () => {
    expect(isInCidr('192.168.1.1', ['192.168.1.1/32'])).toBe(true);
    expect(isInCidr('192.168.1.2', ['192.168.1.1/32'])).toBe(false);
  });

  it('handles /0 CIDR (match all)', () => {
    expect(isInCidr('1.2.3.4', ['0.0.0.0/0'])).toBe(true);
  });
});
