import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { X, Loader2 } from 'lucide-react';
import { useSpecStore } from '../../../stores/spec-store';
import {
  useCanvasStore,
  NODE_TYPE_TO_SECTION,
  type CanvasNodeData,
  type CanvasNodeType,
} from '../../../stores/canvas-store';
import { SPEC_SECTIONS } from '../../../lib/constants';
import ReferenceImageUpload from '../../spec-editor/ReferenceImageUpload';
import NodeShell from './NodeShell';

type SectionNodeType = Node<CanvasNodeData, CanvasNodeType>;

function SectionNode({ id, type, selected }: NodeProps<SectionNodeType>) {
  const removeNode = useCanvasStore((s) => s.removeNode);
  const sectionId = NODE_TYPE_TO_SECTION[type as CanvasNodeType]!;
  const meta = SPEC_SECTIONS.find((s) => s.id === sectionId)!;
  const section = useSpecStore((s) => s.spec.sections[sectionId]);
  const updateSection = useSpecStore((s) => s.updateSection);
  const capturingImage = useSpecStore((s) => s.capturingImage);
  const content = section?.content ?? '';
  const isDesignBrief = type === 'designBrief';
  const isExistingDesign = type === 'existingDesign';
  const hasImages = isExistingDesign;
  const isCapturing = isExistingDesign && capturingImage === sectionId;

  const borderClass = selected
    ? 'border-accent ring-2 ring-accent/20'
    : content.trim()
      ? 'border-border'
      : 'border-dashed border-border';

  return (
    <NodeShell
      nodeId={id}
      selected={!!selected}
      width="w-node"
      borderClass={borderClass}
      hasTarget={isExistingDesign}
      handleColor={content.trim() ? 'green' : 'amber'}
    >
      {/* Header */}
      <div className="border-b border-border-subtle px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-fg">{meta.title}</h3>
          {!meta.required && (
            <span className="text-nano text-fg-faint">optional</span>
          )}
          <button
            onClick={() => removeNode(id)}
            className="nodrag ml-auto shrink-0 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="mt-0.5 text-nano leading-tight text-fg-muted">
          {meta.description}
        </p>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <textarea
          value={content}
          onChange={(e) => updateSection(sectionId, e.target.value)}
          placeholder={
            isDesignBrief
              ? 'What do you want to design? e.g. "Redesign the checkout flow for mobile users"'
              : `Describe the ${meta.title.toLowerCase()}...`
          }
          rows={isDesignBrief ? 5 : 3}
          className="nodrag nowheel w-full resize-none rounded border border-border px-2.5 py-2 text-xs text-fg-secondary placeholder:text-fg-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />

        {/* Reference images for existing design */}
        {hasImages && (
          <div className="nodrag nowheel mt-2">
            <ReferenceImageUpload sectionId={sectionId} />
            {isCapturing && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-accent bg-info-subtle px-3 py-2.5">
                <Loader2 size={14} className="animate-spin text-info" />
                <span className="text-micro text-info">Capturing screenshot...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(SectionNode);
