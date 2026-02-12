import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore, type CanvasNodeType } from '../../stores/canvas-store';
import NodePalette from './NodePalette';

interface CanvasContextMenuProps {
  screenX: number;
  screenY: number;
  onClose: () => void;
}

export default function CanvasContextMenu({
  screenX,
  screenY,
  onClose,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useCanvasStore((s) => s.addNode);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const flowPosition = screenToFlowPosition({ x: screenX, y: screenY });

  function handleAdd(type: CanvasNodeType) {
    addNode(type, flowPosition);
    onClose();
  }

  return (
    <div
      ref={ref}
      className="fixed z-50"
      style={{ left: screenX, top: screenY }}
    >
      <NodePalette onAdd={handleAdd} position={flowPosition} />
    </div>
  );
}
