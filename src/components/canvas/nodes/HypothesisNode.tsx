import { memo, useCallback, useEffect, useState } from 'react';
import { useReactFlow, type NodeProps, type Node, Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, X, Sparkles, Loader2 } from 'lucide-react';
import { useSpecStore } from '../../../stores/spec-store';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { useGenerationStore } from '../../../stores/generation-store';
import {
  useCanvasStore,
  type CanvasNodeData,
} from '../../../stores/canvas-store';
import { compileVariantPrompts } from '../../../services/compiler';
import { useGenerate, type ProvenanceContext } from '../../../hooks/useGenerate';
import { DEFAULT_GENERATION_PROVIDER } from '../../../lib/constants';
import { generateId, now } from '../../../lib/utils';
import type { OutputFormat } from '../../../types/provider';
import type { ReferenceImage } from '../../../types/spec';
import { useNodeProviderModel } from '../../../hooks/useNodeProviderModel';
import ProviderSelector from '../../generation/ProviderSelector';
import ModelSelector from '../../shared/ModelSelector';
import NodeShell from './NodeShell';

type HypothesisNodeType = Node<CanvasNodeData, 'hypothesis'>;

function HypothesisNode({ id: nodeId, data, selected }: NodeProps<HypothesisNodeType>) {
  const { fitView } = useReactFlow();
  const strategyId = data.refId as string;

  const spec = useSpecStore((s) => s.spec);
  const strategy = useCompilerStore(
    (s) => findVariantStrategy(s.dimensionMaps, strategyId),
  );
  const updateVariant = useCompilerStore((s) => s.updateVariant);
  const setCompiledPrompts = useCompilerStore((s) => s.setCompiledPrompts);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  const removeNode = useCanvasStore((s) => s.removeNode);
  const syncAfterGenerate = useCanvasStore((s) => s.syncAfterGenerate);
  const setEdgeStatusBySource = useCanvasStore((s) => s.setEdgeStatusBySource);
  const setEdgeStatusByTarget = useCanvasStore((s) => s.setEdgeStatusByTarget);
  const forkHypothesisVariants = useCanvasStore((s) => s.forkHypothesisVariants);
  const clearVariantNodeIdMap = useCanvasStore((s) => s.clearVariantNodeIdMap);

  const generate = useGenerate();

  const {
    providerId,
    modelId,
    supportsVision,
    handleProviderChange,
    handleModelChange,
  } = useNodeProviderModel(DEFAULT_GENERATION_PROVIDER, nodeId, { disconnectOnChange: false });

  // Persist format in canvas node data
  const storedFormat = useCanvasStore(
    (s) => s.nodes.find((n) => n.id === nodeId)?.data.format as string | undefined,
  );
  const format = (storedFormat as OutputFormat) || 'react';
  const setFormat = useCallback((f: OutputFormat) => {
    useCanvasStore.getState().updateNodeData(nodeId, { format: f });
  }, [nodeId]);

  const [expanded, setExpanded] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Clear progress when generation ends
  useEffect(() => {
    if (!isGenerating) setGenerationProgress(null);
  }, [isGenerating]);

  const update = useCallback(
    (field: string, value: string) => {
      updateVariant(strategyId, { [field]: value });
    },
    [strategyId, updateVariant],
  );

  const handleDelete = useCallback(() => {
    removeNode(nodeId);
  }, [nodeId, removeNode]);

  // Read last-run config from node data for fork detection
  const lastRunProviderId = useCanvasStore(
    (s) => s.nodes.find((n) => n.id === nodeId)?.data.lastRunProviderId as string | undefined,
  );
  const lastRunModelId = useCanvasStore(
    (s) => s.nodes.find((n) => n.id === nodeId)?.data.lastRunModelId as string | undefined,
  );
  const lastRunFormat = useCanvasStore(
    (s) => s.nodes.find((n) => n.id === nodeId)?.data.lastRunFormat as string | undefined,
  );

  const handleGenerate = useCallback(async () => {
    if (!strategy) return;

    // Fork if config changed since last run
    const configChanged = lastRunProviderId != null && (
      lastRunProviderId !== providerId ||
      lastRunModelId !== modelId ||
      lastRunFormat !== format
    );
    if (configChanged) {
      forkHypothesisVariants(nodeId);
    }

    // Collect design system content from connected DesignSystem nodes
    const { nodes: canvasNodes, edges: canvasEdges } = useCanvasStore.getState();
    const incomingEdges = canvasEdges.filter((e) => e.target === nodeId);
    const dsNodes = incomingEdges
      .map((e) => canvasNodes.find((n) => n.id === e.source && n.type === 'designSystem'))
      .filter(Boolean);

    let dsContent: string | undefined;
    let dsImages: ReferenceImage[] = [];
    if (dsNodes.length > 0) {
      const parts = dsNodes.map((n) => {
        const t = (n!.data.title as string) || 'Design System';
        const c = (n!.data.content as string) || '';
        return c.trim() ? `## ${t}\n${c}` : '';
      }).filter(Boolean);
      dsContent = parts.join('\n\n---\n\n') || undefined;
      dsImages = dsNodes.flatMap((n) => (n!.data.images as ReferenceImage[]) || []);
    }

    // Build a single-variant dimension map for prompt compilation
    const filteredMap = {
      id: generateId(),
      specId: spec.id,
      dimensions: [],
      variants: [strategy],
      generatedAt: now(),
      compilerModel: 'merged',
    };

    const prompts = compileVariantPrompts(spec, filteredMap, dsContent, dsImages);
    setCompiledPrompts(prompts);

    setEdgeStatusBySource(nodeId, 'processing');
    setGenerationError(null);

    // Build provenance context
    const provenanceCtx: ProvenanceContext = {
      strategies: {
        [strategy.id]: {
          name: strategy.name,
          primaryEmphasis: strategy.primaryEmphasis,
          rationale: strategy.rationale,
          dimensionValues: strategy.dimensionValues,
        },
      },
      designSystemSnapshot: dsContent || undefined,
      format,
    };

    const generatedPlaceholders = await generate(
      providerId,
      prompts,
      { format, model: modelId, supportsVision },
      {
        onPlaceholdersReady: (placeholders) => {
          syncAfterGenerate(placeholders, nodeId);
          setGenerationProgress({ completed: 0, total: placeholders.length });
          setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 200);
        },
        onResultComplete: (placeholderId) => {
          setGenerationProgress((prev) =>
            prev ? { ...prev, completed: prev.completed + 1 } : null,
          );
          const result = useGenerationStore.getState().results.find(
            (r) => r.id === placeholderId,
          );
          if (result) {
            const variantNodeId = useCanvasStore.getState().variantNodeIdMap.get(
              result.variantStrategyId,
            );
            if (variantNodeId) {
              setEdgeStatusByTarget(variantNodeId, 'complete');
            }
          }
        },
      },
      provenanceCtx,
    );

    // Check for errors
    const runId = generatedPlaceholders[0]?.runId;
    if (runId) {
      const allResults = useGenerationStore.getState().results;
      const runResults = allResults.filter((r) => r.runId === runId);
      const errorCount = runResults.filter((r) => r.status === 'error').length;
      if (errorCount > 0) {
        setGenerationError(`Generation failed`);
      }
    }

    // Store last-run config for fork detection
    useCanvasStore.getState().updateNodeData(nodeId, {
      lastRunProviderId: providerId,
      lastRunModelId: modelId,
      lastRunFormat: format,
    });

    clearVariantNodeIdMap();
    setEdgeStatusBySource(nodeId, 'complete');
  }, [
    strategy,
    nodeId,
    spec,
    providerId,
    format,
    modelId,
    supportsVision,
    lastRunProviderId,
    lastRunModelId,
    lastRunFormat,
    setCompiledPrompts,
    generate,
    syncAfterGenerate,
    forkHypothesisVariants,
    clearVariantNodeIdMap,
    setEdgeStatusBySource,
    setEdgeStatusByTarget,
    fitView,
  ]);

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
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
        <input
          value={strategy.name}
          onChange={(e) => update('name', e.target.value)}
          className="nodrag nowheel min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-fg outline-none hover:border-border focus:border-accent"
        />
        <button
          onClick={handleDelete}
          className="nodrag shrink-0 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>

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

function CompactField({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-nano font-medium text-fg-muted">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="nodrag nowheel w-full resize-none rounded border border-border px-2 py-1.5 text-micro text-fg-secondary outline-none focus:border-accent"
      />
    </div>
  );
}

export default memo(HypothesisNode);
