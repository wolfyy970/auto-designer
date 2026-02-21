import { useCallback, useEffect, useRef, useState } from 'react';

const REFERENCE_WIDTH = 1280;
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.05;
const DEFAULT_VARIANT_ZOOM = 0.4;

export { ZOOM_MIN, ZOOM_MAX };

export function useVariantZoom() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomOffset, setZoomOffset] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const autoZoom = containerWidth > 0 ? containerWidth / REFERENCE_WIDTH : DEFAULT_VARIANT_ZOOM;
  const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, autoZoom + zoomOffset));

  const zoomIn = useCallback(() => setZoomOffset((o) => o + ZOOM_STEP), []);
  const zoomOut = useCallback(() => setZoomOffset((o) => o - ZOOM_STEP), []);
  const resetZoom = useCallback(() => setZoomOffset(0), []);

  return { contentRef, zoom, zoomIn, zoomOut, resetZoom };
}
