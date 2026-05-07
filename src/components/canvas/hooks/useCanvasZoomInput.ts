import { useCallback, useEffect, useRef } from 'react';
import type { FitView, Viewport } from '@xyflow/react';
import { fitViewWithDefaults } from '../../../lib/canvas-fit-view';
import {
  canvasKeyboardZoomCommand,
  isEditableZoomShortcutTarget,
} from '../../../lib/canvas-keyboard-zoom';
import {
  canvasWheelZoomFactor,
  eventTargetInside,
  isBrowserPinchWheel,
  viewportForZoomAtPoint,
} from '../../../lib/canvas-zoom';

type UseCanvasZoomInputOptions = {
  getViewport: () => Viewport;
  setFlowViewport: (viewport: Viewport, options?: { duration?: number }) => void;
  fitView: FitView;
  zoomIn: (options?: { duration?: number }) => void;
  zoomOut: (options?: { duration?: number }) => void;
};

type NativeGestureEvent = Event & {
  scale?: number;
  clientX?: number;
  clientY?: number;
};

export function useCanvasZoomInput({
  getViewport,
  setFlowViewport,
  fitView,
  zoomIn,
  zoomOut,
}: UseCanvasZoomInputOptions) {
  const canvasZoomRootRef = useRef<HTMLDivElement>(null);
  const isPointerOverCanvasRef = useRef(false);
  const gestureScaleRef = useRef(1);

  const zoomCanvasAtClientPoint = useCallback(
    (clientX: number, clientY: number, zoomFactor: number) => {
      const root = canvasZoomRootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const nextViewport = viewportForZoomAtPoint(
        getViewport(),
        {
          x: clientX - rect.left,
          y: clientY - rect.top,
        },
        zoomFactor,
      );
      void setFlowViewport(nextViewport, { duration: 0 });
    },
    [getViewport, setFlowViewport],
  );

  useEffect(() => {
    function preventBrowserZoom(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
    }

    function handleWheel(event: WheelEvent) {
      if (!isBrowserPinchWheel(event)) return;
      preventBrowserZoom(event);

      if (!eventTargetInside(event.target, canvasZoomRootRef.current)) return;
      zoomCanvasAtClientPoint(
        event.clientX,
        event.clientY,
        canvasWheelZoomFactor(event.deltaY),
      );
    }

    function handleGestureStart(event: Event) {
      gestureScaleRef.current = 1;
      preventBrowserZoom(event);
    }

    function handleGestureChange(event: Event) {
      preventBrowserZoom(event);
      if (!eventTargetInside(event.target, canvasZoomRootRef.current)) return;

      const gesture = event as NativeGestureEvent;
      const scale = typeof gesture.scale === 'number' ? gesture.scale : 1;
      const factor = scale / gestureScaleRef.current;
      gestureScaleRef.current = scale;

      const root = canvasZoomRootRef.current;
      const rect = root?.getBoundingClientRect();
      zoomCanvasAtClientPoint(
        typeof gesture.clientX === 'number'
          ? gesture.clientX
          : (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
        typeof gesture.clientY === 'number'
          ? gesture.clientY
          : (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
        factor,
      );
    }

    const options: AddEventListenerOptions = { capture: true, passive: false };
    document.addEventListener('wheel', handleWheel, options);
    document.addEventListener('gesturestart', handleGestureStart, options);
    document.addEventListener('gesturechange', handleGestureChange, options);
    return () => {
      document.removeEventListener('wheel', handleWheel, options);
      document.removeEventListener('gesturestart', handleGestureStart, options);
      document.removeEventListener('gesturechange', handleGestureChange, options);
    };
  }, [zoomCanvasAtClientPoint]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const command = canvasKeyboardZoomCommand(event);
      if (!command) return;

      event.preventDefault();
      if (!isPointerOverCanvasRef.current) return;
      if (isEditableZoomShortcutTarget(event.target)) return;
      if (command === 'zoom-in') {
        void zoomIn({ duration: 120 });
      } else if (command === 'zoom-out') {
        void zoomOut({ duration: 120 });
      } else {
        fitViewWithDefaults(fitView);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView, zoomIn, zoomOut]);

  const markPointerOverCanvas = useCallback(() => {
    isPointerOverCanvasRef.current = true;
  }, []);

  const markPointerOutsideCanvas = useCallback(() => {
    isPointerOverCanvasRef.current = false;
  }, []);

  return {
    canvasZoomRootRef,
    markPointerOverCanvas,
    markPointerOutsideCanvas,
  };
}
