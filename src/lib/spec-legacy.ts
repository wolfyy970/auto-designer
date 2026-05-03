import type { DesignSpec, SpecSection } from '../types/spec';

export const LEGACY_EXISTING_DESIGN_SECTION_ID = 'existing-design';

/**
 * Normalise a `DesignSpec` arriving from outside the active store: saved-canvas
 * snapshots, meta-harness imports, future "Import from JSON" paths. Strips
 * fields that are no longer part of the canonical shape so they cannot sneak
 * back into the store and survive until the next persist hydrate.
 *
 * Currently strips:
 *  - the retired `existing-design` section (legacy spec shape)
 *  - the retired `internalContextDocument` field (Phase 7 D internal-context
 *    cleanup; see the plan file for context)
 *
 * Idempotent: a second pass on already-normalised input is a no-op.
 */
export function normaliseImportedSpec(spec: DesignSpec): DesignSpec {
  return stripLegacyInternalContextDocument(stripLegacyExistingDesignSection(spec));
}

function stripLegacyExistingDesignSection(spec: DesignSpec): DesignSpec {
  if (!spec.sections[LEGACY_EXISTING_DESIGN_SECTION_ID]) return spec;
  const { [LEGACY_EXISTING_DESIGN_SECTION_ID]: _removed, ...sections } = spec.sections;
  void _removed;
  return {
    ...spec,
    sections: sections as Record<string, SpecSection>,
  };
}

function stripLegacyInternalContextDocument(spec: DesignSpec): DesignSpec {
  const candidate = spec as DesignSpec & { internalContextDocument?: unknown };
  if (!('internalContextDocument' in candidate)) return spec;
  const { internalContextDocument: _removed, ...rest } = candidate;
  void _removed;
  return rest as DesignSpec;
}

