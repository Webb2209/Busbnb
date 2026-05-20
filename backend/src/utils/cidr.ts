/**
 * src/utils/cidr.ts
 * Pure Node.js CIDR matching — no external dependencies.
 * Uses the built-in `net` module for IPv4 subnet checks.
 */
import { Socket } from 'net';

/**
 * Convert an IPv4 address string to a 32-bit integer.
 */
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check whether `ip` falls within any of the given CIDR ranges.
 *
 * @param ip    - IPv4 address string (e.g. "196.201.214.55")
 * @param cidrs - Array of CIDR strings (e.g. ["196.201.214.0/24"])
 * @returns true if the IP is in any CIDR range
 */
export function isInCidr(ip: string, cidrs: string[]): boolean {
  // Strip IPv6-mapped IPv4 prefix (::ffff:x.x.x.x) that Node adds for dual-stack sockets
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Validate it's a plain IPv4 address before processing
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(cleanIp)) return false;

  const ipInt = ipToInt(cleanIp);

  for (const cidr of cidrs) {
    const [range, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const networkInt = ipToInt(range) & mask;
    if ((ipInt & mask) === networkInt) return true;
  }

  return false;
}
