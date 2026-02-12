import { useCanvasStore } from '../stores/canvas-store';

/**
 * Returns a Tailwind class string for lineage-based dimming/highlighting.
 * - When no lineage is active: returns ''
 * - When lineage is active and this node IS in lineage: returns accent ring
 * - When lineage is active and this node is NOT in lineage: returns dim opacity
 */
export function useLineageDim(nodeId: string, isSelected: boolean): string {
  const lineageNodeIds = useCanvasStore((s) => s.lineageNodeIds);
  if (lineageNodeIds.size === 0) return '';
  if (lineageNodeIds.has(nodeId)) {
    return isSelected ? '' : 'ring-1 ring-indigo-300';
  }
  return '';
}
