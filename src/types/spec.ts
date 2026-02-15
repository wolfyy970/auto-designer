export type SpecSectionId =
  | 'design-brief'
  | 'existing-design'
  | 'research-context'
  | 'objectives-metrics'
  | 'design-constraints'
  /** @deprecated Design System content now lives in DesignSystemNode canvas node data.
   *  Kept for backward compatibility with spec import/export and legacy routes. */
  | 'design-system';

export interface SpecSectionMeta {
  id: SpecSectionId;
  title: string;
  description: string;
  required: boolean;
}

export interface ReferenceImage {
  id: string;
  filename: string;
  dataUrl: string;
  description: string;
  extractedContext?: string;
  createdAt: string;
}

export interface SpecSection {
  id: SpecSectionId;
  content: string;
  images: ReferenceImage[];
  lastModified: string;
}

export interface DesignSpec {
  id: string;
  title: string;
  sections: Record<SpecSectionId, SpecSection>;
  createdAt: string;
  lastModified: string;
  version: number;
}
