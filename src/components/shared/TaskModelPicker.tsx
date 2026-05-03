/**
 * Compact provider+model picker for a single Settings row. Renders both
 * controls inline and shows a Brain / ↓ chip indicating whether the
 * selected model supports extended thinking. When `disabled` (lockdown),
 * both controls become read-only and a tooltip explains why.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, ChevronDown } from 'lucide-react';
import { listProviders } from '../../api/client';
import { useProviderModels } from '../../hooks/useProviderModels';
import { supportsReasoningModel } from '../../lib/model-capabilities';

export interface TaskModelPickerProps {
  providerId: string;
  modelId: string;
  defaultProviderId: string;
  defaultModelId: string;
  onChange: (next: { providerId: string; modelId: string } | undefined) => void;
  disabled?: boolean;
  ariaLabelPrefix: string;
}

export function TaskModelPicker({
  providerId,
  modelId,
  defaultProviderId,
  defaultModelId,
  onChange,
  disabled = false,
  ariaLabelPrefix,
}: TaskModelPickerProps) {
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
    staleTime: 5 * 60 * 1000,
  });
  const { data: models = [], isLoading } = useProviderModels(providerId);

  const reasoningSupported = useMemo(() => supportsReasoningModel(modelId), [modelId]);

  const handleProviderChange = (nextProvider: string) => {
    if (nextProvider === defaultProviderId && modelId === defaultModelId) {
      onChange(undefined);
      return;
    }
    // When provider changes, re-pick the first model from the new provider list
    // (the actual model list arrives async; the user can pick once it loads).
    onChange({ providerId: nextProvider, modelId: '' });
  };

  const handleModelChange = (nextModel: string) => {
    if (nextModel === defaultModelId && providerId === defaultProviderId) {
      onChange(undefined);
      return;
    }
    onChange({ providerId, modelId: nextModel });
  };

  const tooltip = disabled
    ? 'Model is locked by deployment.'
    : reasoningSupported
      ? 'Model supports extended thinking.'
      : 'Model does not support extended thinking — Effort is ignored for this row.';

  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        value={providerId}
        onChange={(e) => handleProviderChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-border bg-bg px-2 py-1 text-nano text-fg-secondary input-focus disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`${ariaLabelPrefix} provider`}
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={modelId}
        onChange={(e) => handleModelChange(e.target.value)}
        disabled={disabled || isLoading}
        className="max-w-[14rem] truncate rounded-md border border-border bg-bg px-2 py-1 text-nano text-fg-secondary input-focus disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`${ariaLabelPrefix} model`}
        title={modelId}
      >
        {models.length === 0 ? <option value="">{isLoading ? 'Loading…' : modelId || '—'}</option> : null}
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name ?? m.id}
          </option>
        ))}
      </select>
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-fg-faint"
        title={tooltip}
        aria-label={tooltip}
      >
        {reasoningSupported ? <Brain size={11} aria-hidden /> : <ChevronDown size={11} aria-hidden />}
      </span>
    </div>
  );
}
