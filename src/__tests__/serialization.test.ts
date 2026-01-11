import { describe, it, expect } from 'vitest';
import { stableStringify, sha256Hex } from '../utils/serialization.js';

describe('serialization', () => {
  it('stableStringify sorts object keys deterministically', () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('sha256Hex produces a 64-char hex string', () => {
    const s = stableStringify({ a: 1 });
    const h = sha256Hex(s);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
