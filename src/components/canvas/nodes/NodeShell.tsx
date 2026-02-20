import { type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useLineageDim } from '../../../hooks/useLineageDim';
import { useCanvasStore } from '../../../stores/canvas-store';
import { isValidConnection } from '../../../lib/canvas-connections';

interface NodeShellProps {
  nodeId: string;
  nodeType: string;
  selected: boolean;
  width: string;
  borderClass: string;
  className?: string;
  hasTarget?: boolean;
  hasSource?: boolean;
  handleColor?: 'amber' | 'green';
  targetShape?: 'circle' | 'diamond';
  targetPulse?: boolean;
  children: ReactNode;
}

export default function NodeShell({
  nodeId,
  nodeType,
  selected,
  width,
  borderClass,
  className,
  hasTarget = true,
  hasSource = true,
  handleColor = 'amber',
  targetShape = 'circle',
  targetPulse = false,
  children,
}: NodeShellProps) {
  const lineageDim = useLineageDim(nodeId, selected);
  const connectingFrom = useCanvasStore((s) => s.connectingFrom);

  const isGreen = handleColor === 'green';
  const handleFill = isGreen ? '!bg-success' : '!bg-warning';

  // Layer 3A: compute glow/dim during connection drag
  let targetGlow = '';
  let sourceGlow = '';
  if (connectingFrom) {
    if (connectingFrom.handleType === 'source' && hasTarget) {
      targetGlow = isValidConnection(connectingFrom.nodeType, nodeType)
        ? 'handle-glow-valid' : 'handle-glow-dim';
    }
    if (connectingFrom.handleType === 'target' && hasSource) {
      sourceGlow = isValidConnection(nodeType, connectingFrom.nodeType)
        ? 'handle-glow-valid' : 'handle-glow-dim';
    }
  }

  // Layer 1: diamond shape + breathing pulse for target handle
  const shapeClass = targetShape === 'diamond' ? 'handle-diamond' : '';
  const pulseClass = targetPulse && !targetGlow ? 'handle-pulse' : '';

  return (
    <div className={`relative ${width} rounded-lg border bg-surface-raised shadow-sm ${borderClass} ${lineageDim} ${className ?? ''}`}>
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className={`!h-3 !w-3 !border-2 !border-surface-raised ${handleFill} ${shapeClass} ${pulseClass} ${targetGlow}`}
        />
      )}
      {children}
      {hasSource && (
        <Handle
          type="source"
          position={Position.Right}
          className={`!h-3 !w-3 !border-2 !border-surface-raised ${handleFill} ${sourceGlow}`}
        />
      )}
    </div>
  );
}
