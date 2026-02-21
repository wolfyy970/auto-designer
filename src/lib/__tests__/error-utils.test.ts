import { describe, it, expect } from 'vitest';
import { normalizeError } from '../error-utils';

describe('normalizeError', () => {
  it('returns the message from an Error instance', () => {
    expect(normalizeError(new Error('boom'))).toBe('boom');
  });

  it('returns the fallback when given a non-Error and fallback is provided', () => {
    expect(normalizeError(null, 'fallback msg')).toBe('fallback msg');
    expect(normalizeError(undefined, 'fallback msg')).toBe('fallback msg');
    expect(normalizeError(42, 'fallback msg')).toBe('fallback msg');
  });

  it('stringifies non-Error values when no fallback is provided', () => {
    expect(normalizeError('raw string')).toBe('raw string');
    expect(normalizeError(42)).toBe('42');
    expect(normalizeError(null)).toBe('null');
  });

  it('prefers Error.message over the fallback', () => {
    expect(normalizeError(new Error('real message'), 'fallback')).toBe('real message');
  });

  it('handles subclasses of Error', () => {
    class CustomError extends Error {}
    expect(normalizeError(new CustomError('custom'))).toBe('custom');
  });
});
