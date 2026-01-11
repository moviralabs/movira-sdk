import crypto from 'crypto';

/**
 * Deterministic JSON serialization with sorted keys.
 * Ensures stable output for hashing and signing.
 */
export function stableStringify(obj: unknown): string {
  return JSON.stringify(sortObject(obj));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const res: Record<string, unknown> = {};
    for (const k of keys) {
      // @ts-ignore
      res[k] = sortObject((value as any)[k]);
    }
    return res;
  }
  return value;
}

/**
 * SHA-256 hash (hex) of stable serialization
 */
export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
