import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { useCanvasStore, type CanvasNodeData } from '../../../stores/canvas-store';
import { useLineageDim } from '../../../hooks/useLineageDim';
import { badgeColor } from '../../../lib/generation-badge-colors';

type HypothesisNodeType = Node<CanvasNodeData, 'hypothesis'>;

function HypothesisNode({ id: nodeId, data, selected }: NodeProps<HypothesisNodeType>) {
  const strategyId = data.refId as string;
  const generation = data.generation as number | undefined;
  const strategy = useCompilerStore(
    (s) => findVariantStrategy(s.dimensionMaps, strategyId)
  );
  const updateVariant = useCompilerStore((s) => s.updateVariant);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const lineageDim = useLineageDim(nodeId, !!selected);

  const [expanded, setExpanded] = useState(false);

  const update = useCallback(
    (field: string, value: string) => {
      updateVariant(strategyId, { [field]: value });
    },
    [strategyId, updateVariant]
  );

  const handleDelete = useCallback(() => {
    removeNode(nodeId);
  }, [nodeId, removeNode]);

  if (!strategy) {
    return (
      <div className="relative w-[300px] rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-400">
        <Handle type="target" position={Position.Left} className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white" />
        Hypothesis not found
        <button
          onClick={handleDelete}
          className="nodrag absolute right-2 top-2 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Remove"
        >
          <X size={12} />
        </button>
        <Handle type="source" position={Position.Right} className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white" />
      </div>
    );
  }

  const borderClass = selected
    ? 'border-blue-400 ring-2 ring-blue-200'
    : 'border-gray-200';

  return (
    <div className={`relative w-[300px] rounded-lg border bg-white shadow-sm ${borderClass} ${lineageDim}`}>
      {/* Generation badge */}
      {generation != null && (
        <span className={`absolute -right-2 -top-2 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badgeColor(generation).bg} ${badgeColor(generation).text}`}>
          G{generation}
        </span>
      )}

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
        <input
          value={strategy.name}
          onChange={(e) => update('name', e.target.value)}
          className="nodrag nowheel min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-gray-900 outline-none hover:border-gray-200 focus:border-gray-400"
        />
        <button
          onClick={handleDelete}
          className="nodrag shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>

      {/* Primary Emphasis */}
      <div className="px-3 py-2">
        <label className="mb-0.5 block text-[10px] font-medium text-gray-400">
          Primary Emphasis
        </label>
        <input
          value={strategy.primaryEmphasis}
          onChange={(e) => update('primaryEmphasis', e.target.value)}
          className="nodrag nowheel w-full rounded border border-gray-200 px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:border-gray-400"
        />
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          <CompactField
            label="Rationale"
            value={strategy.rationale}
            onChange={(v) => update('rationale', v)}
            rows={2}
          />
          <CompactField
            label="How It Differs"
            value={strategy.howItDiffers}
            onChange={(v) => update('howItDiffers', v)}
            rows={2}
          />
          <CompactField
            label="Coupled Decisions"
            value={strategy.coupledDecisions}
            onChange={(v) => update('coupledDecisions', v)}
            rows={2}
          />
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />
    </div>
  );
}

function CompactField({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-medium text-gray-400">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="nodrag nowheel w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:border-gray-400"
      />
    </div>
  );
}

export default memo(HypothesisNode);
