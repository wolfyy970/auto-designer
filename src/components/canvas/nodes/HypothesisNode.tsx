import { memo, useCallback, useState } from 'react';
import { type NodeProps, type Node, Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, X, Sparkles, Loader2 } from 'lucide-react';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { useCanvasStore } from '../../../stores/canvas-store';
import type { HypothesisNodeData } from '../../../types/canvas-data';
import { DEFAULT_GENERATION_PROVIDER } from '../../../lib/constants';
import type { OutputFormat } from '../../../types/provider';
import { useNodeProviderModel } from '../../../hooks/useNodeProviderModel';
import { useHypothesisGeneration } from '../../../hooks/useHypothesisGeneration';
import ProviderSelector from '../../generation/ProviderSelector';
import ModelSelector from '../../shared/ModelSelector';
import NodeShell from './NodeShell';
import NodeHeader from './NodeHeader';
import CompactField from './CompactField';

type HypothesisNodeType = Node<HypothesisNodeData, 'hypothesis'>;

function HypothesisNode({ id: nodeId, data, selected }: NodeProps<HypothesisNodeType>) {
  const strategyId = data.refId;

  const strategy = useCompilerStore(
    (s) => findVariantStrategy(s.dimensionMaps, strategyId),
  );
  const updateVariant = useCompilerStore((s) => s.updateVariant);

  const removeNode = useCanvasStore((s) => s.removeNode);

  const {
    providerId,
    modelId,
    supportsVision,
    handleProviderChange,
    handleModelChange,
  } = useNodeProviderModel(DEFAULT_GENERATION_PROVIDER, nodeId, { disconnectOnChange: false });

  // Persist format in canvas node data
  const format: OutputFormat = data.format || 'react';
  const setFormat = useCallback((f: OutputFormat) => {
    useCanvasStore.getState().updateNodeData(nodeId, { format: f });
  }, [nodeId]);

  const { handleGenerate, isGenerating, generationProgress, generationError } =
    useHypothesisGeneration({
      nodeId,
      strategyId,
      providerId,
      modelId,
      format,
      supportsVision,
    });

  const [expanded, setExpanded] = useState(false);

  const update = useCallback(
    (field: string, value: string) => {
      updateVariant(strategyId, { [field]: value });
    },
    [strategyId, updateVariant],
  );

  const handleDelete = useCallback(() => {
    removeNode(nodeId);
  }, [nodeId, removeNode]);

  if (!strategy) {
    return (
      <div className="relative w-node rounded-lg border border-dashed border-border bg-surface-raised p-4 text-center text-xs text-fg-muted">
        <Handle type="target" position={Position.Left} className="!h-4 !w-4 !border-2 !border-border !bg-surface-raised" />
        Hypothesis not found
        <button
          onClick={handleDelete}
          className="nodrag absolute right-2 top-2 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
          title="Remove"
        >
          <X size={12} />
        </button>
        <Handle type="source" position={Position.Right} className="!h-4 !w-4 !border-2 !border-border !bg-surface-raised" />
      </div>
    );
  }

  const borderClass = selected
    ? 'border-accent ring-2 ring-accent/20'
    : isGenerating
      ? 'border-accent/50 animate-pulse'
      : 'border-border';

  const canGenerate = !!strategy.name.trim() && !!strategy.primaryEmphasis.trim() && !!modelId;

  return (
    <NodeShell
      nodeId={nodeId}
      selected={!!selected}
      width="w-node"
      borderClass={borderClass}
      handleColor={canGenerate ? 'green' : 'amber'}
    >
      <NodeHeader onRemove={handleDelete}>
        <input
          value={strategy.name}
          onChange={(e) => update('name', e.target.value)}
          className="nodrag nowheel min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-fg outline-none hover:border-border focus:border-accent"
        />
      </NodeHeader>

      {/* Primary Emphasis */}
      <div className="px-3 py-2">
        <label className="mb-0.5 block text-nano font-medium text-fg-muted">
          Primary Emphasis
        </label>
        <input
          value={strategy.primaryEmphasis}
          onChange={(e) => update('primaryEmphasis', e.target.value)}
          className="nodrag nowheel w-full rounded border border-border px-2 py-1.5 text-micro text-fg-secondary outline-none focus:border-accent"
        />
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-nano text-fg-muted hover:text-fg-secondary"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          <CompactField
            label="Rationale"
            value={strategy.rationale}
            onChange={(v) => update('rationale', v)}
            rows={2}
          />
          <CompactField
            label="How It Differs"
            value={strategy.howItDiffers}
            onChange={(v) => update('howItDiffers', v)}
            rows={2}
          />
          <CompactField
            label="Coupled Decisions"
            value={strategy.coupledDecisions}
            onChange={(v) => update('coupledDecisions', v)}
            rows={2}
          />
        </div>
      )}

      {/* ── Generation Controls ──────────────────────────────── */}
      <div className="border-t border-border-subtle px-3 py-2.5">
        {generationError && (
          <div className="mb-2 rounded bg-error-subtle px-2 py-1.5 text-nano text-error">
            {generationError}
          </div>
        )}
        <div className="nodrag nowheel space-y-2">
          <ProviderSelector
            selectedId={providerId}
            onChange={handleProviderChange}
          />
          <ModelSelector
            label="Model"
            providerId={providerId}
            selectedModelId={modelId}
            onChange={handleModelChange}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-secondary">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as OutputFormat)}
              className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs text-fg-secondary outline-none focus:border-accent"
            >
              <option value="react">React</option>
              <option value="html">HTML</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-fg px-3 py-2 text-xs font-medium text-bg transition-colors hover:bg-fg/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {generationProgress
                  ? `Creating ${generationProgress.completed}/${generationProgress.total}...`
                  : 'Creating...'}
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Create
              </>
            )}
          </button>
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(HypothesisNode);
