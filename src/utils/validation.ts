/** Simple runtime validators used across SDK */

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function isValidAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function isValidPublicKeyString(value: string): boolean {
  // rudimentary validation: base58 length bounds
  return typeof value === 'string' && value.length >= 32 && value.length <= 44;
}

export function isFutureTimestamp(ts: number): boolean {
  return typeof ts === 'number' && ts > Math.floor(Date.now() / 1000);
}
