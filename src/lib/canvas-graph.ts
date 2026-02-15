import type { Node, Edge } from '@xyflow/react';
import type { DesignSpec } from '../types/spec';
import type { GenerationResult } from '../types/provider';
import type { CritiqueInput } from './prompts/compiler-user';
import { loadCode } from '../services/idb-storage';
import {
  NODE_TYPE_TO_SECTION,
  SECTION_NODE_TYPES,
  type CanvasNodeType,
  type CanvasNodeData,
} from '../stores/canvas-store';

type AnyNode = Node<CanvasNodeData, string>;
type AnyEdge = Edge;

// ── Compile inputs ──────────────────────────────────────────────────

export interface CompileInputs {
  partialSpec: DesignSpec;
  referenceDesigns: { name: string; code: string }[];
  critiques: CritiqueInput[];
}

/**
 * Walk the graph from a compiler node to build all inputs
 * needed for compilation — a partial spec (connected sections only),
 * reference designs (from connected variant nodes), and critiques.
 *
 * Async because generated code is now stored in IndexedDB.
 */
export async function buildCompileInputs(
  nodes: AnyNode[],
  edges: AnyEdge[],
  spec: DesignSpec,
  compilerId: string,
  results: GenerationResult[],
): Promise<CompileInputs> {
  const incomingEdges = edges.filter((e) => e.target === compilerId);
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
  const referenceDesigns: { name: string; code: string }[] = [];
  const collectVariantCode = async (variantNode: AnyNode) => {
    if (variantNode.type === 'variant' && variantNode.data.refId) {
      const result = results.find((r) => r.id === variantNode.data.refId);
      if (result) {
        // Try in-memory code first (during active generation), then IndexedDB
        const code = result.code ?? (await loadCode(result.id));
        if (code) {
          referenceDesigns.push({
            name: result.metadata?.model ?? 'Previous Design',
            code,
          });
        }
      }
    }
  };

  const codePromises: Promise<void>[] = [];
  for (const node of connectedNodes) {
    // Direct variant → compiler
    codePromises.push(collectVariantCode(node));

    // Indirect variant → section → compiler (follow edges into section nodes)
    if (SECTION_NODE_TYPES.has(node.type as CanvasNodeType)) {
      const sectionInputEdges = edges.filter((e) => e.target === node.id);
      for (const e of sectionInputEdges) {
        const sourceNode = nodes.find((n) => n.id === e.source);
        if (sourceNode) codePromises.push(collectVariantCode(sourceNode));
      }
    }
  }
  await Promise.all(codePromises);

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
          const result = results.find((r) => r.id === sourceNode.data.refId);
          if (result) {
            const code = result.code ?? (await loadCode(result.id));
            if (code) {
              critique.variantCode = code;
            }
          }
        }
      }

      critiques.push(critique);
    }
  }

  return { partialSpec, referenceDesigns, critiques };
}

