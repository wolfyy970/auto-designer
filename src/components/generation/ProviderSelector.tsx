import { getAvailableProviders } from '../../services/providers/registry';

interface ProviderSelectorProps {
  selectedId: string;
  onChange: (id: string) => void;
}

export default function ProviderSelector({
  selectedId,
  onChange,
}: ProviderSelectorProps) {
  const providers = getAvailableProviders();

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        Generation Provider
      </label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400"
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
