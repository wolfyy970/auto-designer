import { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Map,
  RotateCcw,
  Plus,
  Minus,
  MoveHorizontal,
  AlignHorizontalSpaceAround,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../stores/canvas-store';
import NodePalette from './NodePalette';

const GAP_STEP = 40;

export default function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const showMiniMap = useCanvasStore((s) => s.showMiniMap);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const colGap = useCanvasStore((s) => s.colGap);
  const autoLayout = useCanvasStore((s) => s.autoLayout);
  const toggleMiniMap = useCanvasStore((s) => s.toggleMiniMap);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const setColGap = useCanvasStore((s) => s.setColGap);
  const toggleAutoLayout = useCanvasStore((s) => s.toggleAutoLayout);
  const applyAutoLayout = useCanvasStore((s) => s.applyAutoLayout);

  const [showPalette, setShowPalette] = useState(false);
  const [showGapControl, setShowGapControl] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    if (!showPalette && !showGapControl) return;
    function handleClick(e: MouseEvent) {
      if (showPalette && paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPalette(false);
      }
      if (showGapControl && gapRef.current && !gapRef.current.contains(e.target as Node)) {
        setShowGapControl(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPalette, showGapControl]);

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      <div className="relative" ref={paletteRef}>
        <ToolButton
          icon={<Plus size={16} />}
          label="Add node"
          onClick={() => setShowPalette((v) => !v)}
          active={showPalette}
        />
        {showPalette && (
          <div className="absolute bottom-0 left-full ml-2">
            <NodePalette onAdd={(type, pos) => {
              useCanvasStore.getState().addNode(type, pos);
              setShowPalette(false);
            }} />
          </div>
        )}
      </div>
      <div className="my-0.5 border-t border-gray-100" />
      <ToolButton
        icon={<ZoomIn size={16} />}
        label="Zoom in"
        onClick={() => zoomIn({ duration: 200 })}
      />
      <ToolButton
        icon={<ZoomOut size={16} />}
        label="Zoom out"
        onClick={() => zoomOut({ duration: 200 })}
      />
      <ToolButton
        icon={<Maximize2 size={16} />}
        label="Fit view"
        onClick={() => fitView({ duration: 300, padding: 0.15 })}
      />
      <div className="my-0.5 border-t border-gray-100" />
      <ToolButton
        icon={<Map size={16} />}
        label="Toggle minimap"
        onClick={toggleMiniMap}
        active={showMiniMap}
      />
      <ToolButton
        icon={<LayoutGrid size={16} />}
        label="Toggle grid"
        onClick={toggleGrid}
        active={showGrid}
      />
      <div className="my-0.5 border-t border-gray-100" />
      <ToolButton
        icon={<AlignHorizontalSpaceAround size={16} />}
        label={autoLayout ? 'Auto layout on (click to disable)' : 'Auto layout off (click to enable)'}
        onClick={toggleAutoLayout}
        active={autoLayout}
      />
      <ToolButton
        icon={<RotateCcw size={16} />}
        label="Tidy up"
        onClick={applyAutoLayout}
      />
      <div className="relative" ref={gapRef}>
        <ToolButton
          icon={<MoveHorizontal size={16} />}
          label="Column spacing"
          onClick={() => setShowGapControl((v) => !v)}
          active={showGapControl}
        />
        {showGapControl && (
          <div className="absolute bottom-0 left-full ml-2 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm">
            <button
              onClick={() => setColGap(colGap - GAP_STEP)}
              className="rounded p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
              disabled={colGap <= 80}
              title="Decrease spacing"
            >
              <Minus size={14} />
            </button>
            <span className="min-w-[3ch] text-center text-[10px] text-gray-500">{colGap}</span>
            <button
              onClick={() => setColGap(colGap + GAP_STEP)}
              className="rounded p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
              disabled={colGap >= 320}
              title="Increase spacing"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {icon}
    </button>
  );
}
