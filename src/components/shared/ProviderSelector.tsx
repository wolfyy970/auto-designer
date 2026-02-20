import { getAvailableProviders } from '../../services/providers/registry';

interface ProviderSelectorProps {
  selectedId: string;
  onChange: (id: string) => void;
  label?: string;
}

export default function ProviderSelector({
  selectedId,
  onChange,
  label = 'Generation Provider',
}: ProviderSelectorProps) {
  const providers = getAvailableProviders();

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-fg-secondary">
        {label}
      </label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-xs text-fg-secondary outline-none focus:border-accent"
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
