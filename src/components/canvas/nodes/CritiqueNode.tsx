import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { X } from 'lucide-react';
import { useCanvasStore, type CanvasNodeData } from '../../../stores/canvas-store';
import { useLineageDim } from '../../../hooks/useLineageDim';

type CritiqueNodeType = Node<CanvasNodeData, 'critique'>;

function CritiqueNode({ id, data, selected }: NodeProps<CritiqueNodeType>) {
  const removeNode = useCanvasStore((s) => s.removeNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const lineageDim = useLineageDim(id, !!selected);

  const title = (data.title as string) || '';
  const strengths = (data.strengths as string) || '';
  const improvements = (data.improvements as string) || '';
  const direction = (data.direction as string) || '';

  const update = useCallback(
    (field: string, value: string) => updateNodeData(id, { [field]: value }),
    [id, updateNodeData]
  );

  const borderClass = selected
    ? 'border-amber-400 ring-2 ring-amber-200'
    : (strengths.trim() || improvements.trim() || direction.trim())
      ? 'border-amber-300'
      : 'border-dashed border-amber-200';

  return (
    <div className={`w-[320px] rounded-lg border bg-white shadow-sm ${borderClass} ${lineageDim}`}>
      {/* Target handle (left) ← variant */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-4 !w-4 !border-2 !border-amber-300 !bg-white"
      />

      {/* Header */}
      <div className="border-b border-amber-100 bg-amber-50/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Critique"
            className="nodrag nowheel min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-gray-900 placeholder:text-amber-300 outline-none hover:border-amber-200 focus:border-amber-400"
          />
          <button
            onClick={() => removeNode(id)}
            className="nodrag shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="mt-0.5 text-[10px] leading-tight text-amber-400">
          Feedback for next iteration
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-2.5 px-3 py-2.5">
        <CritiqueField
          label="What works well"
          value={strengths}
          onChange={(v) => update('strengths', v)}
          placeholder="Preserve these aspects..."
        />
        <CritiqueField
          label="What needs improvement"
          value={improvements}
          onChange={(v) => update('improvements', v)}
          placeholder="Change or fix these..."
        />
        <CritiqueField
          label="Direction"
          value={direction}
          onChange={(v) => update('direction', v)}
          placeholder="Try this next..."
        />
      </div>

      {/* Source handle (right) → compiler */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !border-2 !border-amber-300 !bg-white"
      />
    </div>
  );
}

function CritiqueField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-medium text-amber-500">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="nodrag nowheel w-full resize-none rounded border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-700 placeholder:text-gray-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
      />
    </div>
  );
}

export default memo(CritiqueNode);
