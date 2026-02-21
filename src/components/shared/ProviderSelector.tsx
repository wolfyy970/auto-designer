import { useQuery } from '@tanstack/react-query';
import { listProviders } from '../../api/client';

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
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-fg-secondary">
        {label}
      </label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-xs text-fg-secondary input-focus"
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
