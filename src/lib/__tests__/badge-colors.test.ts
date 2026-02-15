import { describe, it, expect } from 'vitest';
import { badgeColor } from '../badge-colors';

describe('badgeColor', () => {
  it('returns first color for version 1', () => {
    const color = badgeColor(1);
    expect(color.bg).toBe('bg-info-subtle');
    expect(color.text).toBe('text-info');
  });

  it('returns second color for version 2', () => {
    const color = badgeColor(2);
    expect(color.bg).toBe('bg-accent-subtle');
    expect(color.text).toBe('text-accent');
  });

  it('cycles back after exhausting all colors', () => {
    // There are 6 colors, so version 7 should cycle back to color 0
    const color7 = badgeColor(7);
    const color1 = badgeColor(1);
    expect(color7.bg).toBe(color1.bg);
    expect(color7.text).toBe(color1.text);
  });

  it('handles large version numbers', () => {
    // Should not throw
    const color = badgeColor(100);
    expect(color.bg).toBeDefined();
    expect(color.text).toBeDefined();
  });
});
