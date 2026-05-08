import { useEffect, useMemo, useState, type CSSProperties } from 'react';

const FALLBACK_DEVICE_PIXEL_RATIO = 1;
const MIN_DIALOG_PAGE_SCALE = 0.5;
const MAX_DIALOG_PAGE_SCALE = 4;
const SCALE_EPSILON = 0.01;

const baseDevicePixelRatio =
  typeof window === 'undefined'
    ? FALLBACK_DEVICE_PIXEL_RATIO
    : window.devicePixelRatio || FALLBACK_DEVICE_PIXEL_RATIO;

export type DialogZoomInputs = {
  devicePixelRatio: number;
  baseDevicePixelRatio: number;
  visualViewportScale?: number;
};

export function computeDialogPageScale({
  devicePixelRatio,
  baseDevicePixelRatio,
  visualViewportScale = 1,
}: DialogZoomInputs): number {
  const safeBase = Number.isFinite(baseDevicePixelRatio) && baseDevicePixelRatio > 0
    ? baseDevicePixelRatio
    : FALLBACK_DEVICE_PIXEL_RATIO;
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : safeBase;
  const safeVisualScale = Number.isFinite(visualViewportScale) && visualViewportScale > 0
    ? visualViewportScale
    : 1;

  const pageScale = (safeDpr / safeBase) * safeVisualScale;
  return Math.max(MIN_DIALOG_PAGE_SCALE, Math.min(MAX_DIALOG_PAGE_SCALE, pageScale));
}

function readDialogPageScale(): number {
  if (typeof window === 'undefined') return 1;
  return computeDialogPageScale({
    devicePixelRatio: window.devicePixelRatio || baseDevicePixelRatio,
    baseDevicePixelRatio,
    visualViewportScale: window.visualViewport?.scale ?? 1,
  });
}

export function useDialogZoomCompensationStyle(): CSSProperties | undefined {
  const [pageScale, setPageScale] = useState(readDialogPageScale);

  useEffect(() => {
    const update = () => setPageScale(readDialogPageScale());
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', update);
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    update();

    return () => {
      window.removeEventListener('resize', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return useMemo(() => {
    if (Math.abs(pageScale - 1) < SCALE_EPSILON) return undefined;
    return {
      transform: `scale(${1 / pageScale})`,
      transformOrigin: 'center center',
    };
  }, [pageScale]);
}
