import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useSpecStore } from '../../../stores/spec-store';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { useGenerationStore } from '../../../stores/generation-store';
import {
  useCanvasStore,
  type CanvasNodeData,
} from '../../../stores/canvas-store';
import { compileVariantPrompts } from '../../../services/compiler';
import { useGenerate } from '../../../hooks/useGenerate';
import { DEFAULT_GENERATION_PROVIDER } from '../../../lib/constants';
import { generateId, now } from '../../../lib/utils';
import type { OutputFormat } from '../../../types/provider';
import { useLineageDim } from '../../../hooks/useLineageDim';
import { useProviderModels } from '../../../hooks/useProviderModels';
import ProviderSelector from '../../generation/ProviderSelector';
import ModelSelector from '../../shared/ModelSelector';

type GeneratorNodeType = Node<CanvasNodeData, 'generator'>;

function GeneratorNode({ id, selected }: NodeProps<GeneratorNodeType>) {
  const { fitView } = useReactFlow();
  const lineageDim = useLineageDim(id, !!selected);
  const spec = useSpecStore((s) => s.spec);
  const dimensionMaps = useCompilerStore((s) => s.dimensionMaps);
  const setCompiledPrompts = useCompilerStore((s) => s.setCompiledPrompts);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  const removeNode = useCanvasStore((s) => s.removeNode);
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);
  const syncAfterGenerate = useCanvasStore((s) => s.syncAfterGenerate);
  const setEdgeStatusBySource = useCanvasStore((s) => s.setEdgeStatusBySource);
  const disconnectOutputs = useCanvasStore((s) => s.disconnectOutputs);

  const generate = useGenerate();

  const [providerId, setProviderId] = useState(DEFAULT_GENERATION_PROVIDER);
  const [format, setFormat] = useState<OutputFormat>('react');
  const [generationModel, setGenerationModel] = useState('');
  const { data: models } = useProviderModels(providerId);

  // Count connected hypothesis nodes
  const connectedHypothesisCount = useMemo(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    return incomingEdges.filter((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return sourceNode?.type === 'hypothesis';
    }).length;
  }, [edges, nodes, id]);

  const handleProviderChange = useCallback((newId: string) => {
    setProviderId(newId);
    setGenerationModel('');
    disconnectOutputs(id);
  }, [disconnectOutputs, id]);

  const handleModelChange = useCallback(
    (model: string) => {
      if (generationModel && model !== generationModel) {
        disconnectOutputs(id);
      }
      setGenerationModel(model);
    },
    [generationModel, disconnectOutputs, id]
  );

  const handleGenerate = useCallback(async () => {
    // Find connected hypothesis nodes
    const incomingEdges = edges.filter((e) => e.target === id);
    const connectedHypNodeIds = new Set(incomingEdges.map((e) => e.source));
    const connectedHypNodes = nodes.filter(
      (n) => connectedHypNodeIds.has(n.id) && n.type === 'hypothesis'
    );
    const connectedRefIds = new Set(
      connectedHypNodes
        .map((n) => n.data.refId as string)
        .filter(Boolean)
    );

    // Look up variant strategies across all dimension maps
    const connectedVariants = [];
    for (const refId of connectedRefIds) {
      const strategy = findVariantStrategy(dimensionMaps, refId);
      if (strategy) connectedVariants.push(strategy);
    }
    if (connectedVariants.length === 0) return;

    // Build a merged dimension map for prompt compilation
    const filteredMap = {
      id: generateId(),
      specId: spec.id,
      dimensions: [],
      variants: connectedVariants,
      generatedAt: now(),
      compilerModel: 'merged',
    };

    const prompts = compileVariantPrompts(spec, filteredMap);
    setCompiledPrompts(prompts);

    setEdgeStatusBySource(id, 'processing');

    const modelData = models?.find((m) => m.id === generationModel);
    const supportsVision = modelData?.supportsVision ?? false;

    await generate(providerId, prompts, {
      format,
      model: generationModel,
      supportsVision,
    });

    // Read current results from store (not stale placeholders)
    const currentResults = useGenerationStore.getState().results;
    // Only sync results that belong to this generation (match connected variant strategy IDs)
    const relevantResults = currentResults.filter((r) =>
      connectedRefIds.has(r.variantStrategyId)
    );
    syncAfterGenerate(relevantResults, id);
    setEdgeStatusBySource(id, 'complete');
    setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 200);
  }, [
    dimensionMaps,
    edges,
    nodes,
    id,
    spec,
    providerId,
    format,
    generationModel,
    models,
    setCompiledPrompts,
    generate,
    syncAfterGenerate,
    setEdgeStatusBySource,
    fitView,
  ]);

  const borderClass = selected
    ? 'border-blue-400 ring-2 ring-blue-200'
    : isGenerating
      ? 'border-blue-400 animate-pulse'
      : 'border-gray-300';

  return (
    <div className={`w-[280px] rounded-lg border bg-white shadow-sm ${borderClass} ${lineageDim}`}>
      {/* Target handle (left) ← hypothesis nodes */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />

      {/* Header */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900">Designer</h3>
          <button
            onClick={() => removeNode(id)}
            className="nodrag shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          {connectedHypothesisCount} hypothesis{connectedHypothesisCount !== 1 ? 'es' : ''} connected
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-2 px-3 py-2.5">
        <div className="nodrag nowheel space-y-2">
          <ProviderSelector
            selectedId={providerId}
            onChange={handleProviderChange}
          />
          <ModelSelector
            label="Model"
            providerId={providerId}
            selectedModelId={generationModel}
            onChange={handleModelChange}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as OutputFormat)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-800 outline-none focus:border-gray-400"
            >
              <option value="react">React</option>
              <option value="html">HTML</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || connectedHypothesisCount === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Creating...
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

      {/* Source handle (right) → variant nodes */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />
    </div>
  );
}

export default memo(GeneratorNode);
