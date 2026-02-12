import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { X, Loader2 } from 'lucide-react';
import { useSpecStore } from '../../../stores/spec-store';
import {
  useCanvasStore,
  NODE_TYPE_TO_SECTION,
  type CanvasNodeData,
  type CanvasNodeType,
} from '../../../stores/canvas-store';
import { SPEC_SECTIONS } from '../../../lib/constants';
import { useLineageDim } from '../../../hooks/useLineageDim';
import ReferenceImageUpload from '../../spec-editor/ReferenceImageUpload';

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
  const isCapturing = isExistingDesign && capturingImage === sectionId;
  const lineageDim = useLineageDim(id, !!selected);

  const borderClass = selected
    ? 'border-blue-400 ring-2 ring-blue-200'
    : content.trim()
      ? 'border-gray-300'
      : 'border-dashed border-gray-300';

  return (
    <div className={`w-[320px] rounded-lg border bg-white shadow-sm ${borderClass} ${lineageDim}`}>
      {/* Target handle (left) ← variant nodes can feed into Existing Design */}
      {isExistingDesign && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
        />
      )}

      {/* Header */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-gray-900">{meta.title}</h3>
          {!meta.required && (
            <span className="text-[10px] text-gray-300">optional</span>
          )}
          {content.trim() && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
          )}
          <button
            onClick={() => removeNode(id)}
            className={`nodrag ${content.trim() ? '' : 'ml-auto '}shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500`}
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
        <p className="mt-0.5 text-[10px] leading-tight text-gray-400">
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
          className="nodrag nowheel w-full resize-none rounded border border-gray-200 px-2.5 py-2 text-xs text-gray-800 placeholder:text-gray-300 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
        />

        {/* Reference images for existing design (ReferenceImageUpload renders its own previews) */}
        {isExistingDesign && (
          <div className="nodrag nowheel mt-2">
            <ReferenceImageUpload sectionId={sectionId} />
            {isCapturing && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-2.5">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-[11px] text-blue-600">Capturing screenshot...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source handle (right) → connects to Compiler */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
      />
    </div>
  );
}

export default memo(SectionNode);
