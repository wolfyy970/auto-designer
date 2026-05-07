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
