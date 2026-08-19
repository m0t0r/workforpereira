import { randomBytes } from "node:crypto";

/**
 * A UUIDv7, per RFC 9562 §5.7: 48 bits of Unix milliseconds, then 74 bits of randomness, with the
 * version and variant nibbles fixed.
 *
 * ADR-0003 generates these in application code rather than through a Postgres extension, so the
 * value behaves identically in Postgres, in PGlite — whose extension set is limited — and in a unit
 * test with no database at all. Time-ordered, so the unique index on `public_id` stays well behaved
 * where a v4 would fragment it.
 *
 * Monotonicity **within a millisecond is not guaranteed**, and does not need to be: the ordering
 * this exists for is index locality, and nothing in this product orders rows by `public_id`.
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);

  const timestamp = BigInt(Date.now());
  for (let index = 0; index < 6; index += 1) {
    bytes[index] = Number((timestamp >> BigInt(8 * (5 - index))) & 0xffn);
  }

  // Version 7 in the high nibble of octet 6, and the RFC 9562 variant (0b10) in the top two bits
  // of octet 8. Both overwrite random bits, which is why they are applied after the fill.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
