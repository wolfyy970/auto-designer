import { DEFAULT_COL_GAP } from '../lib/canvas-layout';
import { STORAGE_KEYS } from '../lib/storage-keys';

const FRESH_STATE = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 0.85 },
  showMiniMap: true,
  showGrid: true,
  colGap: DEFAULT_COL_GAP,
  autoLayout: true,
};

/**
 * Run all canvas store migrations from `fromVersion` → current.
 * Each migration mutates `state` in place and falls through to the next.
 */
export function migrateCanvasState(
  state: unknown,
  fromVersion: number,
): Record<string, unknown> {
  let s = state;

  // v0/v1 → v4: complete reset (too old to migrate incrementally)
  if (fromVersion < 2) return { ...FRESH_STATE };

  // v2 → v3: fix stale 'incubator' nodes
  if (fromVersion < 3) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const edges = (st.edges as Array<Record<string, unknown>>) ?? [];
    s = {
      ...st,
      nodes: nodes.map((n) => ({
        ...n,
        type: n.type === 'incubator' ? 'designer' : n.type,
        id: n.id === 'incubator-node' ? 'generator-node' : n.id,
      })),
      edges: edges.map((e) => ({
        ...e,
        source: e.source === 'incubator-node' ? 'generator-node' : e.source,
        target: e.target === 'incubator-node' ? 'generator-node' : e.target,
        id: typeof e.id === 'string'
          ? e.id.replace('incubator', 'designer')
          : e.id,
      })),
    };
  }

  // v3 → v4: reset canvas for multi-compiler/generator support
  if (fromVersion < 4) return { ...FRESH_STATE };

  // v5 → v6: rename 'generator' node type to 'designer'
  if (fromVersion < 6) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const edges = (st.edges as Array<Record<string, unknown>>) ?? [];
    s = {
      ...st,
      nodes: nodes.map((n) => ({
        ...n,
        type: n.type === 'generator' ? 'designer' : n.type,
      })),
      edges: edges.map((e) => ({
        ...e,
        id: typeof e.id === 'string'
          ? e.id.replace('generator', 'designer')
          : e.id,
      })),
    };
  }

  // v6 → v7: add variantStrategyId to variant nodes
  if (fromVersion < 7) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const genRaw = localStorage.getItem(STORAGE_KEYS.GENERATION);
    const genResults: Array<Record<string, unknown>> = [];
    if (genRaw) {
      try {
        const parsed = JSON.parse(genRaw);
        genResults.push(...(parsed?.state?.results ?? []));
      } catch { /* ignore */ }
    }
    const resultById = new Map<string, string>();
    for (const r of genResults) {
      if (r.id && r.variantStrategyId) {
        resultById.set(r.id as string, r.variantStrategyId as string);
      }
    }
    s = {
      ...st,
      nodes: nodes.map((n) => {
        if (n.type === 'variant' && n.data) {
          const data = n.data as Record<string, unknown>;
          if (!data.variantStrategyId && data.refId) {
            const vsId = resultById.get(data.refId as string);
            if (vsId) {
              return { ...n, data: { ...data, variantStrategyId: vsId } };
            }
          }
        }
        return n;
      }),
    };
  }

  // v7 → v8: provider/model/format now stored in node data (no transform needed)

  // v8 → v9: remove designer nodes (merged into hypothesis)
  if (fromVersion < 9) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const edges = (st.edges as Array<Record<string, unknown>>) ?? [];
    const designerIds = new Set(
      nodes.filter((n) => n.type === 'designer').map((n) => n.id as string),
    );

    const newEdges: Array<Record<string, unknown>> = [];
    const hypothesisNodes = nodes.filter((n) => n.type === 'hypothesis');
    const variantNodes = nodes.filter((n) => n.type === 'variant');
    for (const hyp of hypothesisNodes) {
      const hypData = hyp.data as Record<string, unknown> | undefined;
      const hypRefId = hypData?.refId as string | undefined;
      if (!hypRefId) continue;
      for (const v of variantNodes) {
        const vData = v.data as Record<string, unknown> | undefined;
        if (vData?.variantStrategyId === hypRefId) {
          newEdges.push({
            id: `e-${hyp.id as string}-${v.id as string}`,
            source: hyp.id as string,
            target: v.id as string,
            type: 'dataFlow',
          });
        }
      }
    }

    s = {
      ...st,
      nodes: nodes.filter((n) => n.type !== 'designer'),
      edges: [
        ...edges.filter(
          (e) => !designerIds.has(e.source as string) && !designerIds.has(e.target as string),
        ),
        ...newEdges,
      ],
    };
  }

  // v9 → v10: ensure hypothesis→variant edges exist
  if (fromVersion < 10) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const edges = (st.edges as Array<Record<string, unknown>>) ?? [];

    const existingHypVariantEdges = new Set<string>();
    for (const e of edges) {
      existingHypVariantEdges.add(`${e.source as string}→${e.target as string}`);
    }

    const newEdges: Array<Record<string, unknown>> = [];
    const hypothesisNodes = nodes.filter((n) => n.type === 'hypothesis');
    const variantNodes = nodes.filter((n) => n.type === 'variant');
    for (const hyp of hypothesisNodes) {
      const hypData = hyp.data as Record<string, unknown> | undefined;
      const hypRefId = hypData?.refId as string | undefined;
      if (!hypRefId) continue;
      for (const v of variantNodes) {
        const vData = v.data as Record<string, unknown> | undefined;
        if (vData?.variantStrategyId === hypRefId) {
          const key = `${hyp.id as string}→${v.id as string}`;
          if (!existingHypVariantEdges.has(key)) {
            newEdges.push({
              id: `e-${hyp.id as string}-${v.id as string}`,
              source: hyp.id as string,
              target: v.id as string,
              type: 'dataFlow',
            });
          }
        }
      }
    }

    if (newEdges.length > 0) {
      s = { ...st, edges: [...edges, ...newEdges] };
    }
  }

  // v10 → v11: designSystem is now self-contained (content in node.data, not spec store)
  if (fromVersion < 11) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const edges = (st.edges as Array<Record<string, unknown>>) ?? [];

    const specRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CANVAS);
    let dsContent = '';
    let dsImages: unknown[] = [];
    if (specRaw) {
      try {
        const parsed = JSON.parse(specRaw);
        const dsSection = parsed?.state?.spec?.sections?.['design-system'];
        if (dsSection) {
          dsContent = dsSection.content || '';
          dsImages = dsSection.images || [];
        }
      } catch { /* ignore */ }
    }

    const updatedNodes = nodes.map((n) => {
      if (n.type === 'designSystem') {
        const existingData = (n.data as Record<string, unknown>) || {};
        return {
          ...n,
          data: { ...existingData, title: 'Design System', content: dsContent, images: dsImages },
        };
      }
      return n;
    });

    const newEdges: Array<Record<string, unknown>> = [];
    const dsNodeIds = updatedNodes.filter((n) => n.type === 'designSystem').map((n) => n.id as string);
    const hypNodeIds = updatedNodes.filter((n) => n.type === 'hypothesis').map((n) => n.id as string);
    for (const dsId of dsNodeIds) {
      for (const hypId of hypNodeIds) {
        newEdges.push({
          id: `edge-${dsId}-to-${hypId}`,
          source: dsId,
          target: hypId,
          type: 'dataFlow',
        });
      }
    }

    s = { ...st, nodes: updatedNodes, edges: [...edges, ...newEdges] };
  }

  // v11 → v12: re-attempt designSystem data recovery from spec store
  // (v10→v11 may have run before spec store was hydrated)
  if (fromVersion < 12) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];

    const hasDsNodeMissingContent = nodes.some((n) => {
      if (n.type !== 'designSystem') return false;
      const data = (n.data as Record<string, unknown>) || {};
      return !data.content;
    });

    if (hasDsNodeMissingContent) {
      const specRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CANVAS);
      let dsContent = '';
      let dsImages: unknown[] = [];
      if (specRaw) {
        try {
          const parsed = JSON.parse(specRaw);
          const dsSection = parsed?.state?.spec?.sections?.['design-system'];
          if (dsSection) {
            dsContent = dsSection.content || '';
            dsImages = dsSection.images || [];
          }
        } catch { /* ignore */ }
      }

      if (dsContent || dsImages.length > 0) {
        s = {
          ...st,
          nodes: nodes.map((n) => {
            if (n.type !== 'designSystem') return n;
            const data = (n.data as Record<string, unknown>) || {};
            if (data.content) return n; // already has content, skip
            return {
              ...n,
              data: { ...data, title: data.title || 'Design System', content: dsContent, images: dsImages },
            };
          }),
        };
      }
    }
  }

  // v12 → v13: extract inline providerId/modelId into dedicated Model nodes
  if (fromVersion < 13) {
    const st = s as Record<string, unknown>;
    const nodes = (st.nodes as Array<Record<string, unknown>>) ?? [];
    const edges = (st.edges as Array<Record<string, unknown>>) ?? [];

    // Find nodes with inline model config
    const PROCESSING_TYPES = new Set(['compiler', 'hypothesis', 'designSystem']);
    const nodesWithModel: Array<{ node: Record<string, unknown>; providerId: string; modelId: string }> = [];
    for (const n of nodes) {
      if (!PROCESSING_TYPES.has(n.type as string)) continue;
      const data = (n.data as Record<string, unknown>) || {};
      const pid = data.providerId as string | undefined;
      const mid = data.modelId as string | undefined;
      if (pid && mid) {
        nodesWithModel.push({ node: n, providerId: pid, modelId: mid });
      }
    }

    if (nodesWithModel.length > 0) {
      // Group by unique (providerId, modelId)
      const combos = new Map<string, { providerId: string; modelId: string; targetIds: string[] }>();
      for (const { node, providerId, modelId } of nodesWithModel) {
        const key = `${providerId}::${modelId}`;
        if (!combos.has(key)) {
          combos.set(key, { providerId, modelId, targetIds: [] });
        }
        combos.get(key)!.targetIds.push(node.id as string);
      }

      const newModelNodes: Array<Record<string, unknown>> = [];
      const newEdges: Array<Record<string, unknown>> = [];

      let modelIdx = 0;
      for (const [, combo] of combos) {
        const modelNodeId = `model-migrated-${modelIdx++}`;
        const shortName = combo.modelId.split('/').pop() ?? combo.modelId;
        const label = `${combo.providerId} / ${shortName}`;

        // Position: average Y of targets, 400px to the left
        const targetNodes = nodes.filter((n) => combo.targetIds.includes(n.id as string));
        const avgY = targetNodes.length > 0
          ? targetNodes.reduce((sum, n) => sum + ((n.position as Record<string, number>)?.y ?? 300), 0) / targetNodes.length
          : 300;
        const minX = targetNodes.length > 0
          ? Math.min(...targetNodes.map((n) => (n.position as Record<string, number>)?.x ?? 0))
          : 0;

        newModelNodes.push({
          id: modelNodeId,
          type: 'model',
          position: { x: Math.max(0, minX - 400), y: avgY },
          data: { title: label, providerId: combo.providerId, modelId: combo.modelId },
        });

        for (const tid of combo.targetIds) {
          newEdges.push({
            id: `edge-${modelNodeId}-to-${tid}`,
            source: modelNodeId,
            target: tid,
            type: 'dataFlow',
            data: { status: 'idle' },
          });
        }
      }

      // Strip providerId/modelId from processing nodes (keep lastRun* on hypotheses)
      const updatedNodes = nodes.map((n) => {
        if (!PROCESSING_TYPES.has(n.type as string)) return n;
        const data = { ...((n.data as Record<string, unknown>) || {}) };
        delete data.providerId;
        delete data.modelId;
        return { ...n, data };
      });

      s = {
        ...st,
        nodes: [...updatedNodes, ...newModelNodes],
        edges: [...edges, ...newEdges],
      };
    }
  }

  return s as Record<string, unknown>;
}
