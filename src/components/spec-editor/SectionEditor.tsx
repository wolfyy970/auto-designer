import { useCallback, useRef } from 'react';
import type { SpecSectionMeta } from '../../types/spec';
import { useSpecStore } from '../../stores/spec-store';
import TextArea from '../shared/TextArea';

interface SectionEditorProps {
  meta: SpecSectionMeta;
}

export default function SectionEditor({ meta }: SectionEditorProps) {
  const section = useSpecStore((s) => s.spec.sections[meta.id]);
  const updateSection = useSpecStore((s) => s.updateSection);
  const sectionRef = useRef<HTMLElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (content: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateSection(meta.id, content);
      }, 300);
      // Optimistically update via a local intermediate
      updateSection(meta.id, content);
    },
    [meta.id, updateSection]
  );

  // Defensive: if section doesn't exist, show empty content
  const content = section?.content ?? '';

  return (
    <section
      ref={sectionRef}
      id={`section-${meta.id}`}
      data-section-id={meta.id}
      className="scroll-mt-6"
    >
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-fg">
          {meta.title}
          {!meta.required && (
            <span className="ml-2 text-xs font-normal text-fg-muted">
              optional
            </span>
          )}
        </h2>
        <p className="mt-0.5 text-sm text-fg-secondary">{meta.description}</p>
      </div>
      <TextArea
        value={content}
        onChange={handleChange}
        placeholder={`Describe the ${meta.title.toLowerCase()}...`}
        minRows={5}
      />
    </section>
  );
}
