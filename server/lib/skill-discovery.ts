/**
 * Package-skills catalog reader for the `skills_loaded` SSE.
 *
 * The `@auto-designer/pi` package's bundled `skills/` directory is the only
 * source. Invalid YAML / schema failures omit the skill (dev warning).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { env } from '../env.ts';
import { splitYamlFrontmatter } from './frontmatter.ts';
import {
  skillFrontmatterSchema,
  type LoadedSkillSummary,
  type SkillCatalogEntry,
} from './skill-schema.ts';

export type { SkillCatalogEntry };

export const SKILL_FILENAME = 'SKILL.md';

export type { SessionType } from './session-types.ts';
import type { SessionType } from './session-types.ts';

const SESSION_TAGS: Record<SessionType, string[]> = {
  design: ['design'],
  incubation: ['incubation'],
  evaluation: ['evaluation'],
  'inputs-gen': ['inputs-gen'],
  'design-system': ['design-system'],
};

/**
 * Catalog root for the UI/skills_loaded SSE — the @auto-designer/pi package's
 * bundled skills directory. There is no longer a legacy fallback; the agent
 * sees exactly the three skills the package owns.
 */
export function resolvePackageSkillsCatalogRoot(): string {
  return path.resolve(process.cwd(), 'packages', 'auto-designer-pi', 'skills');
}

async function safeReadSkillDir(skillsRoot: string, name: string): Promise<SkillCatalogEntry | null> {
  if (name.startsWith('_') || name.startsWith('.')) return null;
  const dir = path.join(skillsRoot, name);
  const skillPath = path.join(dir, SKILL_FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(skillPath, 'utf8');
  } catch {
    return null;
  }
  const split = splitYamlFrontmatter(raw);
  if (!split) return null;
  let data: unknown;
  try {
    data = parseYaml(split.frontmatterYaml);
  } catch (err) {
    if (env.isDev) {
      console.warn(`[skill-discovery] Invalid YAML in ${skillPath}`, err);
    }
    return null;
  }
  const parsed = skillFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    if (env.isDev) {
      console.warn(
        `[skill-discovery] Invalid skill frontmatter in ${skillPath}`,
        parsed.error.flatten(),
      );
    }
    return null;
  }

  return {
    ...parsed.data,
    key: name,
    dir,
    bodyMarkdown: split.body,
    resources: [],
  };
}

/** Filter skills for a specific Pi session type by matching tags. */
export function filterSkillsForSession(
  entries: SkillCatalogEntry[],
  sessionType: SessionType,
): SkillCatalogEntry[] {
  const allowedTags = SESSION_TAGS[sessionType];
  return entries.filter((e) => {
    if (e.when === 'manual') return false;
    return e.tags.some((t) => allowedTags.includes(t));
  });
}

/** Walk each subdirectory under the skills root for SKILL.md (invalid packages omitted). */
export async function discoverSkills(skillsRoot: string): Promise<SkillCatalogEntry[]> {
  let names: string[];
  try {
    names = await fs.readdir(skillsRoot);
  } catch {
    return [];
  }
  const out: SkillCatalogEntry[] = [];
  for (const name of names) {
    const ent = await safeReadSkillDir(skillsRoot, name);
    if (ent) out.push(ent);
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export function catalogEntriesToSummaries(entries: SkillCatalogEntry[]): LoadedSkillSummary[] {
  return entries.map((s) => ({
    key: s.key,
    name: s.name,
    description: s.description,
  }));
}
