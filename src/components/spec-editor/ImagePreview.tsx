import { X } from 'lucide-react';
import type { ReferenceImage, SpecSectionId } from '../../types/spec';
import { useSpecStore } from '../../stores/spec-store';

interface ImagePreviewProps {
  image: ReferenceImage;
  sectionId: SpecSectionId;
}

export default function ImagePreview({ image, sectionId }: ImagePreviewProps) {
  const updateImageDescription = useSpecStore((s) => s.updateImageDescription);
  const removeImage = useSpecStore((s) => s.removeImage);

  return (
    <div className="group relative flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <img
        src={image.dataUrl}
        alt={image.filename}
        className="h-20 w-20 shrink-0 rounded-md border border-gray-200 object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-xs font-medium text-gray-600">
          {image.filename}
        </span>
        <textarea
          value={image.description}
          onChange={(e) =>
            updateImageDescription(sectionId, image.id, e.target.value)
          }
          placeholder="Describe what this image shows..."
          rows={2}
          className="w-full resize-none rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-gray-400"
        />
      </div>
      <button
        onClick={() => removeImage(sectionId, image.id)}
        className="absolute -right-2 -top-2 hidden rounded-full bg-gray-800 p-0.5 text-white hover:bg-red-600 group-hover:block"
        aria-label="Remove image"
      >
        <X size={12} />
      </button>
    </div>
  );
}
