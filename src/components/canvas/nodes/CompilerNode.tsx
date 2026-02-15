import { memo, useCallback, useMemo } from 'react';
import { useReactFlow, type NodeProps, type Node } from '@xyflow/react';
import { RefreshCw, ArrowRight, X } from 'lucide-react';
import { useSpecStore } from '../../../stores/spec-store';
import { useCompilerStore } from '../../../stores/compiler-store';
import { useGenerationStore } from '../../../stores/generation-store';
import {
  useCanvasStore,
  SECTION_NODE_TYPES,
  type CanvasNodeData,
  type CanvasNodeType,
} from '../../../stores/canvas-store';
import { compileSpec } from '../../../services/compiler';
import { buildCompileInputs } from '../../../lib/canvas-graph';
import { DEFAULT_COMPILER_PROVIDER } from '../../../lib/constants';
import { useNodeProviderModel } from '../../../hooks/useNodeProviderModel';
import ProviderSelector from '../../generation/ProviderSelector';
import ModelSelector from '../../shared/ModelSelector';
import NodeShell from './NodeShell';

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
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);

  const {
    providerId,
    modelId,
    supportsVision,
    handleProviderChange,
    handleModelChange,
  } = useNodeProviderModel(DEFAULT_COMPILER_PROVIDER, id);

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

  const handleCompile = useCallback(async () => {
    const results = useGenerationStore.getState().results;
    const { partialSpec, referenceDesigns, critiques } =
      await buildCompileInputs(nodes, edges, spec, id, results);

    setCompiling(true);
    setError(null);
    setEdgeStatusBySource(id, 'processing');
    try {
      const map = await compileSpec(
        partialSpec, modelId, providerId, referenceDesigns,
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
    modelId,
    providerId,
    supportsVision,
    setCompiling,
    setError,
    setDimensionMapForNode,
    syncAfterCompile,
    setEdgeStatusBySource,
    fitView,
  ]);

  const borderClass = selected
    ? 'border-accent ring-2 ring-accent/20'
    : isCompiling
      ? 'border-accent animate-pulse'
      : 'border-border';

  return (
    <NodeShell
      nodeId={id}
      selected={!!selected}
      width="w-node"
      borderClass={borderClass}
      handleColor={connectedInputCount > 0 && !!modelId ? 'green' : 'amber'}
    >
      {/* Header */}
      <div className="border-b border-border-subtle px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-fg">Incubator</h3>
          <button
            onClick={() => removeNode(id)}
            className="nodrag shrink-0 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="text-nano text-fg-muted">
          {connectedInputCount} input{connectedInputCount !== 1 ? 's' : ''} connected
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-2 px-3 py-2.5">
        {error && (
          <div className="rounded bg-error-subtle px-2 py-1.5 text-nano text-error">
            {error}
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
          <button
            onClick={handleCompile}
            disabled={isCompiling || connectedInputCount === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-fg px-3 py-2 text-xs font-medium text-bg transition-colors hover:bg-fg/90 disabled:cursor-not-allowed disabled:opacity-50"
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
          <p className="text-nano text-fg-secondary">
            {dimensionMap.variants.length} hypotheses generated
          </p>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(CompilerNode);
