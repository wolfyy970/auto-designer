import type { ModelOption } from '../../lib/constants';

interface ModelSelectorProps {
  label: string;
  models: ModelOption[];
  selectedId: string;
  onChange: (id: string) => void;
}

export default function ModelSelector({
  label,
  models,
  selectedId,
  onChange,
}: ModelSelectorProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — {m.description}
          </option>
        ))}
      </select>
    </div>
  );
}
