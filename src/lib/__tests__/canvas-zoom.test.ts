/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  canvasWheelZoomFactor,
  clampCanvasZoom,
  eventTargetInside,
  isBrowserPinchWheel,
  viewportForZoomAtPoint,
} from '../canvas-zoom';

describe('canvas-zoom', () => {
  it('recognizes browser pinch wheel events', () => {
    expect(isBrowserPinchWheel({ ctrlKey: true } as WheelEvent)).toBe(true);
    expect(isBrowserPinchWheel({ ctrlKey: false } as WheelEvent)).toBe(false);
  });

  it('maps negative wheel delta to zoom-in and positive delta to zoom-out', () => {
    expect(canvasWheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(canvasWheelZoomFactor(100)).toBeLessThan(1);
  });

  /**
   * Contract test for pinch sensitivity. A typical macOS trackpad pinch
   * tick arrives as a wheel event with `ctrlKey: true` and `deltaY` in
   * the 1-10 range; with sensitivity 0.002 each tick changed zoom by
   * only ~1%, so reaching 50% zoom from 100% required ~70 ticks and
   * felt glacial. The sensitivity was bumped to 0.01 so a 10-deltaY
   * tick now changes zoom by ~10% (factor in the 0.90-0.91 range for
   * zoom-out, 1.10-1.11 for zoom-in). If someone reverts toward 0.002
   * without intending to, this test fails and surfaces the regression.
   *
   * The bounds are intentionally loose (0.85 < factor < 0.95) so the
   * test allows tuning between roughly 0.005 and 0.02 without breaking
   * — anything outside that range is far enough from the chosen value
   * that the maintainer should reason about it explicitly.
   */
  it('keeps pinch sensitivity in the responsive range — 10-deltaY tick produces noticeable zoom', () => {
    const factor = canvasWheelZoomFactor(10);
    expect(factor).toBeLessThan(0.95);
    expect(factor).toBeGreaterThan(0.85);

    // Symmetric for zoom-in.
    const invFactor = canvasWheelZoomFactor(-10);
    expect(invFactor).toBeGreaterThan(1.05);
    expect(invFactor).toBeLessThan(1.18);
  });

  it('clamps canvas zoom to the supported range', () => {
    expect(clampCanvasZoom(0.01)).toBe(0.15);
    expect(clampCanvasZoom(3)).toBe(2);
    expect(clampCanvasZoom(1)).toBe(1);
  });

  it('keeps the point under the cursor stable while zooming', () => {
    const next = viewportForZoomAtPoint(
      { x: -100, y: -50, zoom: 0.5 },
      { x: 300, y: 200 },
      2,
    );

    expect(next.zoom).toBe(1);
    expect(next.x).toBe(-500);
    expect(next.y).toBe(-300);
  });

  it('detects whether an event target belongs to the canvas root', () => {
    const root = document.createElement('div');
    const child = document.createElement('button');
    const outside = document.createElement('div');
    root.append(child);

    expect(eventTargetInside(child, root)).toBe(true);
    expect(eventTargetInside(outside, root)).toBe(false);
    expect(eventTargetInside(null, root)).toBe(false);
  });
});
