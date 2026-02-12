import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useCanvasStore } from '../../../stores/canvas-store';

type DataFlowEdgeData = { status: 'idle' | 'processing' | 'complete' | 'error' };
type DataFlowEdge = Edge<DataFlowEdgeData, 'dataFlow'>;

const STATUS_COLORS: Record<string, string> = {
  idle: '#94a3b8',
  processing: '#3b82f6',
  complete: '#94a3b8',
  error: '#ef4444',
};

export default function DataFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<DataFlowEdge>) {
  const status = data?.status ?? 'idle';
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const lineageEdgeIds = useCanvasStore((s) => s.lineageEdgeIds);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const lineageActive = lineageEdgeIds.size > 0;
  const inLineage = lineageEdgeIds.has(id);

  const baseColor = STATUS_COLORS[status] ?? STATUS_COLORS.idle;
  const color = selected
    ? '#3b82f6'
    : lineageActive && inLineage
      ? '#6366f1'
      : baseColor;
  const opacity = lineageActive && !inLineage && !selected ? 0.15 : 1;
  const isProcessing = status === 'processing';

  return (
    <>
      {/* Wider invisible path for easier click target */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        className="react-flow__edge-interaction"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : lineageActive && inLineage ? 2.5 : 2,
          strokeDasharray: isProcessing ? '8 4' : undefined,
          opacity,
          transition: 'opacity 0.3s, stroke 0.3s',
          filter: lineageActive && inLineage && !selected
            ? 'drop-shadow(0 0 3px rgba(99, 102, 241, 0.4))'
            : undefined,
        }}
      />
      {isProcessing && (
        <BaseEdge
          id={`${id}-animated`}
          path={edgePath}
          style={{
            stroke: color,
            strokeWidth: 2,
            strokeDasharray: '8 4',
            opacity,
            animation: 'dashmove 0.6s linear infinite',
          }}
        />
      )}
      {/* Delete button at midpoint when selected */}
      {selected && (
        <EdgeLabelRenderer>
          <button
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            onClick={() => removeEdge(id)}
            title="Remove connection"
          >
            <X size={12} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
