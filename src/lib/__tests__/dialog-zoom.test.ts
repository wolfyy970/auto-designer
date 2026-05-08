import { describe, expect, it } from 'vitest';
import { computeDialogPageScale } from '../dialog-zoom';

describe('dialog zoom compensation', () => {
  it('keeps normal scale when browser and visual viewport zoom are unchanged', () => {
    expect(
      computeDialogPageScale({
        devicePixelRatio: 2,
        baseDevicePixelRatio: 2,
        visualViewportScale: 1,
      }),
    ).toBe(1);
  });

  it('tracks browser page zoom from device-pixel-ratio changes', () => {
    expect(
      computeDialogPageScale({
        devicePixelRatio: 4,
        baseDevicePixelRatio: 2,
        visualViewportScale: 1,
      }),
    ).toBe(2);
  });

  it('combines browser zoom and visual viewport pinch scale', () => {
    expect(
      computeDialogPageScale({
        devicePixelRatio: 3,
        baseDevicePixelRatio: 2,
        visualViewportScale: 1.5,
      }),
    ).toBe(2.25);
  });

  it('clamps implausible zoom values', () => {
    expect(
      computeDialogPageScale({
        devicePixelRatio: 20,
        baseDevicePixelRatio: 2,
        visualViewportScale: 2,
      }),
    ).toBe(4);
    expect(
      computeDialogPageScale({
        devicePixelRatio: 0.2,
        baseDevicePixelRatio: 2,
        visualViewportScale: 1,
      }),
    ).toBe(0.5);
  });
});
