import { describe, it, expect } from 'vitest';
import { badgeColor } from '../generation-badge-colors';

describe('badgeColor', () => {
  it('returns first color for generation 1', () => {
    const color = badgeColor(1);
    expect(color.bg).toBe('bg-blue-100');
    expect(color.text).toBe('text-blue-600');
  });

  it('returns second color for generation 2', () => {
    const color = badgeColor(2);
    expect(color.bg).toBe('bg-emerald-100');
    expect(color.text).toBe('text-emerald-600');
  });

  it('cycles back after exhausting all colors', () => {
    // There are 6 colors, so generation 7 should cycle back to color 0
    const color7 = badgeColor(7);
    const color1 = badgeColor(1);
    expect(color7.bg).toBe(color1.bg);
    expect(color7.text).toBe(color1.text);
  });

  it('handles large generation numbers', () => {
    // Should not throw
    const color = badgeColor(100);
    expect(color.bg).toBeDefined();
    expect(color.text).toBeDefined();
  });
});
