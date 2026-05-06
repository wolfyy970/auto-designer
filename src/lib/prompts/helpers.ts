import type { DesignSpec } from '../../types/spec';

/** Get trimmed section content, falling back to '(Not provided)' */
export function getSectionContent(spec: DesignSpec, sectionId: string): string {
  const section = spec.sections[sectionId as keyof typeof spec.sections];
  if (!section) return '(Not provided)';
  return section.content.trim() || '(Not provided)';
}
