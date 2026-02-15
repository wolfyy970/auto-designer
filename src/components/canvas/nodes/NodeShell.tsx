import { type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useLineageDim } from '../../../hooks/useLineageDim';

interface NodeShellProps {
  nodeId: string;
  selected: boolean;
  width: string;
  borderClass: string;
  className?: string;
  hasTarget?: boolean;
  hasSource?: boolean;
  handleColor?: 'amber' | 'green';
  children: ReactNode;
}

export default function NodeShell({
  nodeId,
  selected,
  width,
  borderClass,
  className,
  hasTarget = true,
  hasSource = true,
  handleColor = 'amber',
  children,
}: NodeShellProps) {
  const lineageDim = useLineageDim(nodeId, selected);
  const isGreen = handleColor === 'green';
  const handleFill = isGreen ? '!bg-success' : '!bg-warning';

  return (
    <div className={`relative ${width} rounded-lg border bg-surface-raised shadow-sm ${borderClass} ${lineageDim} ${className ?? ''}`}>
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className={`!h-3 !w-3 !border-2 !border-surface-raised ${handleFill}`}
        />
      )}
      {children}
      {hasSource && (
        <Handle
          type="source"
          position={Position.Right}
          className={`!h-3 !w-3 !border-2 !border-surface-raised ${handleFill}`}
        />
      )}
    </div>
  );
}
