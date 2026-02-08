import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import { useCompilerStore } from '../../stores/compiler-store';

interface VariantStrategyCardProps {
  strategy: VariantStrategy;
  index: number;
  total: number;
}

export default function VariantStrategyCard({
  strategy,
  index,
  total,
}: VariantStrategyCardProps) {
  const updateVariant = useCompilerStore((s) => s.updateVariant);
  const removeVariant = useCompilerStore((s) => s.removeVariant);
  const reorderVariants = useCompilerStore((s) => s.reorderVariants);

  const update = (field: keyof VariantStrategy, value: string) => {
    updateVariant(strategy.id, { [field]: value });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <input
          value={strategy.name}
          onChange={(e) => update('name', e.target.value)}
          className="flex-1 rounded border border-transparent px-1 text-base font-semibold text-gray-900 outline-none hover:border-gray-200 focus:border-gray-400"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => reorderVariants(index, index - 1)}
            disabled={index === 0}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => reorderVariants(index, index + 1)}
            disabled={index === total - 1}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={() => removeVariant(strategy.id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove variant"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Field
          label="Primary Emphasis"
          value={strategy.primaryEmphasis}
          onChange={(v) => update('primaryEmphasis', v)}
        />
        <Field
          label="Rationale"
          value={strategy.rationale}
          onChange={(v) => update('rationale', v)}
          rows={3}
        />
        <Field
          label="How It Differs"
          value={strategy.howItDiffers}
          onChange={(v) => update('howItDiffers', v)}
          rows={2}
        />
        <Field
          label="Coupled Decisions"
          value={strategy.coupledDecisions}
          onChange={(v) => update('coupledDecisions', v)}
          rows={2}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full resize-none rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400"
        />
      )}
    </div>
  );
}
