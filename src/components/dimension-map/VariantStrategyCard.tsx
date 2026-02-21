import { Trash2 } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import { useCompilerStore } from '../../stores/compiler-store';

interface VariantStrategyCardProps {
  strategy: VariantStrategy;
}

export default function VariantStrategyCard({
  strategy,
}: VariantStrategyCardProps) {
  const updateVariant = useCompilerStore((s) => s.updateVariant);
  const removeVariant = useCompilerStore((s) => s.removeVariant);

  const update = (field: keyof VariantStrategy, value: string) => {
    updateVariant(strategy.id, { [field]: value });
  };

  return (
    <div className="rounded-lg border border-border bg-bg p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <input
          value={strategy.name}
          onChange={(e) => update('name', e.target.value)}
          className="flex-1 rounded border border-transparent px-1 text-base font-semibold text-fg outline-none hover:border-border focus:border-accent"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => removeVariant(strategy.id)}
            className="rounded p-1 text-fg-muted hover:bg-error-subtle hover:text-error"
            aria-label="Remove variant"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Field
          label="Hypothesis"
          value={strategy.hypothesis}
          onChange={(v) => update('hypothesis', v)}
          rows={2}
        />
        <Field
          label="Why"
          value={strategy.rationale}
          onChange={(v) => update('rationale', v)}
          rows={3}
        />
        <Field
          label="Measurements"
          value={strategy.measurements}
          onChange={(v) => update('measurements', v)}
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
      <label className="mb-1 block text-xs font-medium text-fg-secondary">
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full resize-none rounded border border-border px-3 py-2 text-sm text-fg-secondary input-focus"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-border px-3 py-2 text-sm text-fg-secondary input-focus"
        />
      )}
    </div>
  );
}
