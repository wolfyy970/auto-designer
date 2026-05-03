/**
 * Compact provider+model picker for a single Settings row. Models are
 * grouped into Reasoning vs Other via `<optgroup>`. When the row's
 * effort is non-off (`requireReasoning`) only the reasoning group is
 * rendered; if the currently selected model is non-reasoning when that
 * gate flips on, the picker auto-swaps to the first reasoning model in
 * the provider's list. When `disabled` (lockdown), both controls are
 * read-only.
 */
import { useEffect, useMemo, useRef } from 'react';
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
  /** When true, hide non-reasoning models and auto-swap if the current pick can't think. */
  requireReasoning?: boolean;
  ariaLabelPrefix: string;
}

export function TaskModelPicker({
  providerId,
  modelId,
  defaultProviderId,
  defaultModelId,
  onChange,
  disabled = false,
  requireReasoning = false,
  ariaLabelPrefix,
}: TaskModelPickerProps) {
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
    staleTime: 5 * 60 * 1000,
  });
  const { data: models = [], isLoading } = useProviderModels(providerId);

  const reasoningSupported = useMemo(() => supportsReasoningModel(modelId), [modelId]);

  const { reasoningModels, otherModels } = useMemo(() => {
    const reasoning: typeof models = [];
    const other: typeof models = [];
    for (const m of models) {
      if (supportsReasoningModel(m.id)) reasoning.push(m);
      else other.push(m);
    }
    return { reasoningModels: reasoning, otherModels: other };
  }, [models]);

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

  // Auto-swap to the first reasoning model when the effort gate flips on
  // (or the loaded list confirms the current pick is non-reasoning). Guarded
  // by a ref so it fires once per (provider, requireReasoning) transition.
  const autoSwapTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (disabled || !requireReasoning || isLoading) return;
    if (reasoningSupported) return;
    if (reasoningModels.length === 0) return;
    const token = `${providerId}|${modelId}`;
    if (autoSwapTokenRef.current === token) return;
    autoSwapTokenRef.current = token;
    onChange({ providerId, modelId: reasoningModels[0]!.id });
  }, [
    disabled,
    requireReasoning,
    isLoading,
    reasoningSupported,
    reasoningModels,
    providerId,
    modelId,
    onChange,
  ]);

  const tooltip = disabled
    ? 'Model is locked by deployment.'
    : reasoningSupported
      ? 'Model supports extended thinking.'
      : requireReasoning
        ? 'Model does not support extended thinking. Pick one from "Reasoning models".'
        : 'Model does not support extended thinking — Effort is ignored for this row.';

  const showOtherGroup = !requireReasoning && otherModels.length > 0;
  const showReasoningGroup = reasoningModels.length > 0;
  const currentInList = models.some((m) => m.id === modelId);

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
        {models.length === 0 ? (
          <option value="">{isLoading ? 'Loading…' : modelId || '—'}</option>
        ) : null}
        {/* Show the current selection as a synthetic option when it's been hidden by the filter — the user still sees what's set. */}
        {models.length > 0 && !currentInList && modelId ? (
          <option value={modelId}>{modelId} (unavailable)</option>
        ) : null}
        {showReasoningGroup ? (
          <optgroup label="Reasoning models">
            {reasoningModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.id}
              </option>
            ))}
          </optgroup>
        ) : null}
        {showOtherGroup ? (
          <optgroup label="Other models">
            {otherModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.id}
              </option>
            ))}
          </optgroup>
        ) : null}
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
