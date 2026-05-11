import type { Viewport } from '@xyflow/react';

export const CANVAS_MIN_ZOOM = 0.15;
export const CANVAS_MAX_ZOOM = 2;

/**
 * Sensitivity of pinch-zoom and ctrl+wheel zoom on the canvas. Used as the
 * exponent factor in `canvasWheelZoomFactor`. Higher = each tick moves
 * the zoom further.
 *
 * macOS trackpad pinches arrive as wheel events with `ctrlKey` and tiny
 * `deltaY` (often 1-10 per tick). At sensitivity 0.002 each tick changed
 * zoom by ~1%, so traversing 100% → 50% took ~70 pinch ticks and felt
 * glacial. 0.01 is closer to the Figma / Miro / xyflow defaults and feels
 * responsive without being twitchy; tune here if pinch overshoots.
 */
const WHEEL_ZOOM_SENSITIVITY = 0.01;

export type CanvasPoint = {
  x: number;
  y: number;
};

export function isBrowserPinchWheel(event: Pick<WheelEvent, 'ctrlKey'>): boolean {
  return event.ctrlKey;
}

export function canvasWheelZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY);
}

export function clampCanvasZoom(
  zoom: number,
  minZoom = CANVAS_MIN_ZOOM,
  maxZoom = CANVAS_MAX_ZOOM,
): number {
  if (!Number.isFinite(zoom)) return minZoom;
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

export function viewportForZoomAtPoint(
  viewport: Viewport,
  point: CanvasPoint,
  zoomFactor: number,
  minZoom = CANVAS_MIN_ZOOM,
  maxZoom = CANVAS_MAX_ZOOM,
): Viewport {
  if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) return viewport;

  const nextZoom = clampCanvasZoom(viewport.zoom * zoomFactor, minZoom, maxZoom);
  if (nextZoom === viewport.zoom) return viewport;

  const flowX = (point.x - viewport.x) / viewport.zoom;
  const flowY = (point.y - viewport.y) / viewport.zoom;

  return {
    x: point.x - flowX * nextZoom,
    y: point.y - flowY * nextZoom,
    zoom: nextZoom,
  };
}

export function eventTargetInside(
  target: EventTarget | null,
  root: HTMLElement | null,
): boolean {
  return target instanceof Node && root != null && root.contains(target);
}
