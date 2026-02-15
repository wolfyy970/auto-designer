import { useCallback, useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSpecStore } from '../stores/spec-store';
import { useCompilerStore, findVariantStrategy } from '../stores/compiler-store';
import { useGenerationStore } from '../stores/generation-store';
import { useCanvasStore } from '../stores/canvas-store';
import { compileVariantPrompts } from '../services/compiler';
import { useGenerate, type ProvenanceContext } from './useGenerate';
import { collectDesignSystemInputs } from '../lib/canvas-graph';
import { generateId, now } from '../lib/utils';
import type { OutputFormat } from '../types/provider';

interface HypothesisGenerationParams {
  nodeId: string;
  strategyId: string;
  providerId: string;
  modelId: string;
  format: OutputFormat;
  supportsVision: boolean;
}

interface GenerationProgress {
  completed: number;
  total: number;
}

/**
 * Encapsulates all generation orchestration for a HypothesisNode:
 * fork detection, prompt compilation, provenance, progress tracking,
 * edge status management, and error checking.
 */
export function useHypothesisGeneration({
  nodeId,
  strategyId,
  providerId,
  modelId,
  format,
  supportsVision,
}: HypothesisGenerationParams) {
  const { fitView } = useReactFlow();

  const spec = useSpecStore((s) => s.spec);
  const strategy = useCompilerStore(
    (s) => findVariantStrategy(s.dimensionMaps, strategyId),
  );
  const setCompiledPrompts = useCompilerStore((s) => s.setCompiledPrompts);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  const syncAfterGenerate = useCanvasStore((s) => s.syncAfterGenerate);
  const setEdgeStatusBySource = useCanvasStore((s) => s.setEdgeStatusBySource);
  const setEdgeStatusByTarget = useCanvasStore((s) => s.setEdgeStatusByTarget);
  const forkHypothesisVariants = useCanvasStore((s) => s.forkHypothesisVariants);
  const clearVariantNodeIdMap = useCanvasStore((s) => s.clearVariantNodeIdMap);

  const generate = useGenerate();

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

  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Clear progress when generation ends
  useEffect(() => {
    if (!isGenerating) setGenerationProgress(null);
  }, [isGenerating]);

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
    const { content: dsContent, images: dsImages } =
      collectDesignSystemInputs(canvasNodes, canvasEdges, nodeId);

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
        setGenerationError('Generation failed');
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

  return { handleGenerate, isGenerating, generationProgress, generationError };
}
