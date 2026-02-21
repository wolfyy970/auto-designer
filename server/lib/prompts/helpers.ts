import type { DesignSpec } from '../../../src/types/spec.ts';

export function getSectionContent(spec: DesignSpec, sectionId: string): string {
  const section = spec.sections[sectionId as keyof typeof spec.sections];
  if (!section) return '(Not provided)';
  return section.content.trim() || '(Not provided)';
}

export function collectImageLines(spec: DesignSpec): string[] {
  return Object.values(spec.sections)
    .flatMap((s) => s.images)
    .filter((img) => img.description.trim())
    .map((img) => `- [${img.filename}]: ${img.description}`);
}
