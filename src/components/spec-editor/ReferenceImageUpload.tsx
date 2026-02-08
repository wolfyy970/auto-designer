import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus } from 'lucide-react';
import type { SpecSectionId } from '../../types/spec';
import { useSpecStore } from '../../stores/spec-store';
import { generateId, now } from '../../lib/utils';
import ImagePreview from './ImagePreview';

interface ReferenceImageUploadProps {
  sectionId: SpecSectionId;
}

export default function ReferenceImageUpload({
  sectionId,
}: ReferenceImageUploadProps) {
  const images = useSpecStore((s) => s.spec.sections[sectionId].images);
  const addImage = useSpecStore((s) => s.addImage);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          addImage(sectionId, {
            id: generateId(),
            filename: file.name,
            dataUrl: reader.result as string,
            description: '',
            createdAt: now(),
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [sectionId, addImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  });

  return (
    <div className="mt-3 space-y-3">
      {images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((img) => (
            <ImagePreview key={img.id} image={img} sectionId={sectionId} />
          ))}
        </div>
      )}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragActive
            ? 'border-gray-500 bg-gray-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <ImagePlus
          size={20}
          className="mx-auto mb-1 text-gray-400"
        />
        <p className="text-xs text-gray-500">
          {isDragActive
            ? 'Drop images here'
            : 'Drop reference images or click to upload'}
        </p>
      </div>
    </div>
  );
}
