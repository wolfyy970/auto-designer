import { memo, useCallback } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { X } from 'lucide-react';
import { useCanvasStore, type CanvasNodeData } from '../../../stores/canvas-store';
import NodeShell from './NodeShell';

type CritiqueNodeType = Node<CanvasNodeData, 'critique'>;

function CritiqueNode({ id, data, selected }: NodeProps<CritiqueNodeType>) {
  const removeNode = useCanvasStore((s) => s.removeNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const title = (data.title as string) || '';
  const strengths = (data.strengths as string) || '';
  const improvements = (data.improvements as string) || '';
  const direction = (data.direction as string) || '';

  const update = useCallback(
    (field: string, value: string) => updateNodeData(id, { [field]: value }),
    [id, updateNodeData]
  );

  const borderClass = selected
    ? 'border-warning ring-2 ring-warning/20'
    : (strengths.trim() || improvements.trim() || direction.trim())
      ? 'border-warning/50'
      : 'border-dashed border-warning/30';

  return (
    <NodeShell
      nodeId={id}
      selected={!!selected}
      width="w-node"
      borderClass={borderClass}
      handleColor={strengths.trim() || improvements.trim() || direction.trim() ? 'green' : 'amber'}
    >
      {/* Header */}
      <div className="border-b border-warning/20 bg-warning-subtle px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Critique"
            className="nodrag nowheel min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-fg placeholder:text-warning/50 outline-none hover:border-warning/30 focus:border-warning"
          />
          <button
            onClick={() => removeNode(id)}
            className="nodrag shrink-0 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="mt-0.5 text-nano leading-tight text-warning">
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
    </NodeShell>
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
      <label className="mb-0.5 block text-nano font-medium text-warning">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="nodrag nowheel w-full resize-none rounded border border-border px-2.5 py-1.5 text-micro text-fg-secondary placeholder:text-fg-faint outline-none focus:border-warning focus:ring-1 focus:ring-warning/20"
      />
    </div>
  );
}

export default memo(CritiqueNode);
