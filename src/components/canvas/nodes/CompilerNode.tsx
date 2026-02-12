import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react';
import { RefreshCw, ArrowRight, X } from 'lucide-react';
import { useSpecStore } from '../../../stores/spec-store';
import { useCompilerStore } from '../../../stores/compiler-store';
import { useGenerationStore } from '../../../stores/generation-store';
import {
  useCanvasStore,
  NODE_TYPE_TO_SECTION,
  SECTION_NODE_TYPES,
  type CanvasNodeData,
  type CanvasNodeType,
} from '../../../stores/canvas-store';
import { compileSpec } from '../../../services/compiler';
import type { CritiqueInput } from '../../../lib/prompts/compiler-user';
import type { DesignSpec } from '../../../types/spec';
import { DEFAULT_COMPILER_PROVIDER } from '../../../lib/constants';
import { useLineageDim } from '../../../hooks/useLineageDim';
import { useProviderModels } from '../../../hooks/useProviderModels';
import ProviderSelector from '../../generation/ProviderSelector';
import ModelSelector from '../../shared/ModelSelector';

type CompilerNodeType = Node<CanvasNodeData, 'compiler'>;

function CompilerNode({ id, selected }: NodeProps<CompilerNodeType>) {
  const { fitView } = useReactFlow();
  const spec = useSpecStore((s) => s.spec);

  const isCompiling = useCompilerStore((s) => s.isCompiling);
  const error = useCompilerStore((s) => s.error);
  const dimensionMap = useCompilerStore((s) => s.dimensionMaps[id]);
  const setDimensionMapForNode = useCompilerStore((s) => s.setDimensionMapForNode);
  const setCompiling = useCompilerStore((s) => s.setCompiling);
  const setError = useCompilerStore((s) => s.setError);

  const removeNode = useCanvasStore((s) => s.removeNode);
  const syncAfterCompile = useCanvasStore((s) => s.syncAfterCompile);
  const setEdgeStatusBySource = useCanvasStore((s) => s.setEdgeStatusBySource);
  const disconnectOutputs = useCanvasStore((s) => s.disconnectOutputs);
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);

  const lineageDim = useLineageDim(id, !!selected);

  // Local provider/model state (per compiler instance)
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_COMPILER_PROVIDER);
  const [selectedModel, setSelectedModel] = useState('');
  const { data: models } = useProviderModels(selectedProvider);

  // Count connected input nodes (sections + variants + critiques)
  const connectedInputCount = useMemo(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    return incomingEdges.filter((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return sourceNode && (
        SECTION_NODE_TYPES.has(sourceNode.type as CanvasNodeType) ||
        sourceNode.type === 'variant' ||
        sourceNode.type === 'critique'
      );
    }).length;
  }, [edges, nodes, id]);

  const handleProviderChange = useCallback(
    (newId: string) => {
      setSelectedProvider(newId);
      setSelectedModel('');
      disconnectOutputs(id);
    },
    [disconnectOutputs, id]
  );

  const handleModelChange = useCallback(
    (model: string) => {
      if (selectedModel && model !== selectedModel) {
        disconnectOutputs(id);
      }
      setSelectedModel(model);
    },
    [selectedModel, disconnectOutputs, id]
  );

  const handleCompile = useCallback(async () => {
    // Build a partial spec with only connected sections
    const incomingEdges = edges.filter((e) => e.target === id);
    const connectedNodeIds = new Set(incomingEdges.map((e) => e.source));
    const connectedNodes = nodes.filter((n) => connectedNodeIds.has(n.id));

    // Build partial spec: keep connected sections, blank out disconnected ones
    const connectedSectionIds = new Set<string>();
    for (const node of connectedNodes) {
      const sid = NODE_TYPE_TO_SECTION[node.type as CanvasNodeType];
      if (sid) connectedSectionIds.add(sid);
    }

    const partialSpec: DesignSpec = {
      ...spec,
      sections: Object.fromEntries(
        Object.entries(spec.sections).map(([sectionId, section]) => [
          sectionId,
          connectedSectionIds.has(sectionId)
            ? section
            : { ...section, content: '', images: [] as typeof section.images },
        ])
      ) as DesignSpec['sections'],
    };

    // Collect reference designs from connected variant nodes
    // Variants can connect directly to compiler OR indirectly via section nodes
    // (e.g. variant → existingDesign → compiler)
    const referenceDesigns: { name: string; code: string }[] = [];
    const collectVariantCode = (variantNode: typeof nodes[number]) => {
      if (variantNode.type === 'variant' && variantNode.data.refId) {
        const result = useGenerationStore.getState().results.find(
          (r) => r.id === variantNode.data.refId
        );
        if (result?.code) {
          referenceDesigns.push({
            name: result.metadata?.model ?? 'Previous Design',
            code: result.code,
          });
        }
      }
    };

    for (const node of connectedNodes) {
      // Direct variant → compiler
      collectVariantCode(node);

      // Indirect variant → section → compiler (follow edges into section nodes)
      if (SECTION_NODE_TYPES.has(node.type as CanvasNodeType)) {
        const sectionInputEdges = edges.filter((e) => e.target === node.id);
        for (const e of sectionInputEdges) {
          const sourceNode = nodes.find((n) => n.id === e.source);
          if (sourceNode) collectVariantCode(sourceNode);
        }
      }
    }

    // Collect critiques from connected critique nodes
    const critiques: CritiqueInput[] = [];
    for (const node of connectedNodes) {
      if (node.type === 'critique') {
        const critique: CritiqueInput = {
          title: (node.data.title as string) || 'Critique',
          strengths: (node.data.strengths as string) || '',
          improvements: (node.data.improvements as string) || '',
          direction: (node.data.direction as string) || '',
        };

        // Follow the critique's incoming edges to find the variant it references
        const critiqueInputEdges = edges.filter((e) => e.target === node.id);
        for (const e of critiqueInputEdges) {
          const sourceNode = nodes.find((n) => n.id === e.source);
          if (sourceNode?.type === 'variant' && sourceNode.data.refId) {
            const result = useGenerationStore.getState().results.find(
              (r) => r.id === sourceNode.data.refId
            );
            if (result?.code) {
              critique.variantCode = result.code;
            }
          }
        }

        critiques.push(critique);
      }
    }

    setCompiling(true);
    setError(null);
    setEdgeStatusBySource(id, 'processing');
    try {
      const modelData = models?.find((m) => m.id === selectedModel);
      const supportsVision = modelData?.supportsVision ?? false;
      const map = await compileSpec(
        partialSpec, selectedModel, selectedProvider, referenceDesigns,
        critiques.length > 0 ? critiques : undefined,
        supportsVision
      );
      setDimensionMapForNode(id, map);
      syncAfterCompile(map, id);
      setEdgeStatusBySource(id, 'complete');
      setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation failed');
      setEdgeStatusBySource(id, 'error');
    } finally {
      setCompiling(false);
    }
  }, [
    spec,
    edges,
    nodes,
    id,
    selectedModel,
    selectedProvider,
    models,
    setCompiling,
    setError,
    setDimensionMapForNode,
    syncAfterCompile,
    setEdgeStatusBySource,
    fitView,
  ]);

  const borderClass = selected
    ? 'border-blue-400 ring-2 ring-blue-200'
    : isCompiling
      ? 'border-blue-400 animate-pulse'
      : 'border-gray-300';

  return (
    <div className={`w-[280px] rounded-lg border bg-white shadow-sm ${borderClass} ${lineageDim}`}>
      {/* Target handle (left) ← section nodes + variant nodes */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />

      {/* Header */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900">Incubator</h3>
          <button
            onClick={() => removeNode(id)}
            className="nodrag shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          {connectedInputCount} input{connectedInputCount !== 1 ? 's' : ''} connected
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-2 px-3 py-2.5">
        {error && (
          <div className="rounded bg-red-50 px-2 py-1.5 text-[10px] text-red-600">
            {error}
          </div>
        )}

        <div className="nodrag nowheel space-y-2">
          <ProviderSelector
            selectedId={selectedProvider}
            onChange={handleProviderChange}
          />
          <ModelSelector
            label="Model"
            providerId={selectedProvider}
            selectedModelId={selectedModel}
            onChange={handleModelChange}
          />
          <button
            onClick={handleCompile}
            disabled={isCompiling || connectedInputCount === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCompiling ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate
                <ArrowRight size={12} />
              </>
            )}
          </button>
        </div>

        {dimensionMap && !isCompiling && (
          <p className="text-[10px] text-gray-500">
            {dimensionMap.variants.length} hypotheses generated
          </p>
        )}
      </div>

      {/* Source handle (right) → hypothesis nodes */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />
    </div>
  );
}

export default memo(CompilerNode);
