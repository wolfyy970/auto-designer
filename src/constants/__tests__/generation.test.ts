import { describe, it, expect } from 'vitest';
import { GENERATION_STATUS, type GenerationStatus } from '../generation';

describe('GENERATION_STATUS', () => {
  it('contains all 4 lifecycle states', () => {
    expect(GENERATION_STATUS.PENDING).toBe('pending');
    expect(GENERATION_STATUS.GENERATING).toBe('generating');
    expect(GENERATION_STATUS.COMPLETE).toBe('complete');
    expect(GENERATION_STATUS.ERROR).toBe('error');
  });

  it('has exactly 4 entries', () => {
    expect(Object.values(GENERATION_STATUS)).toHaveLength(4);
  });

  it('GenerationStatus type covers all values', () => {
    const statuses: GenerationStatus[] = [
      GENERATION_STATUS.PENDING,
      GENERATION_STATUS.GENERATING,
      GENERATION_STATUS.COMPLETE,
      GENERATION_STATUS.ERROR,
    ];
    expect(statuses).toHaveLength(4);
  });

  it('values are unique strings', () => {
    const values = Object.values(GENERATION_STATUS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
