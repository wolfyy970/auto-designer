/**
 * Seed Pi skills into the just-bash VFS.
 *
 * Pi's stock skill discovery flow places `<available_skills>` XML in the
 * system prompt, with each skill's absolute SKILL.md path printed as
 * `<location>`. The agent is instructed to call `read("<location>")` when a
 * skill matches its task. Inside our sandbox, the model-callable `read` tool
 * only sees the just-bash VFS at `/home/user/project` — real-disk paths are
 * unreachable.
 *
 * To preserve Pi's stock skill flow without inventing a parallel mechanism,
 * we seed each filtered skill's SKILL.md content into the VFS at
 * `/home/user/project/.skills/<name>/SKILL.md` at session construction time
 * and produce a path-remapping that the resource loader applies before Pi
 * prints `<location>`. The agent then calls `read` against a VFS path that
 * resolves cleanly through our sandboxed Pi tool.
 *
 * `.skills/` is a workspace concern; `extractDesignFiles` excludes it from
 * the produced design output (see virtual-workspace.ts).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Bash } from 'just-bash';
import { SANDBOX_PROJECT_ROOT } from './virtual-workspace.ts';

/** Subdirectory under the sandbox project root where SKILL.md files are seeded. */
export const SANDBOX_SKILLS_SUBDIR = '.skills';

/** Absolute VFS prefix for seeded skill files. */
export const SANDBOX_SKILLS_DIR = `${SANDBOX_PROJECT_ROOT}/${SANDBOX_SKILLS_SUBDIR}`;

/** Subset of Pi's `Skill` shape we read and rewrite. */
export interface SeedableSkill {
  readonly name: string;
  readonly filePath: string;
  readonly baseDir: string;
}

/** Path-remapping result keyed by the original real-disk SKILL.md path. */
export interface SkillPathRemapping {
  /** Original real-disk filePath → VFS filePath. */
  readonly filePathByOriginalFilePath: ReadonlyMap<string, string>;
  /** Original baseDir → VFS baseDir. */
  readonly baseDirByOriginalBaseDir: ReadonlyMap<string, string>;
}

/** Compute the VFS file path for a skill, given its name and the SKILL.md basename. */
export function vfsSkillFilePath(skillName: string, fileName = 'SKILL.md'): string {
  // Skill names are validated by Pi (lowercase a-z, 0-9, hyphens). Defensive
  // basename-only check here so a malformed skill can't escape the seeded dir.
  const safeName = path.posix.basename(skillName);
  const safeFile = path.posix.basename(fileName);
  return `${SANDBOX_SKILLS_DIR}/${safeName}/${safeFile}`;
}

/** Compute the VFS baseDir (parent of SKILL.md) for a skill. */
export function vfsSkillBaseDir(skillName: string): string {
  return `${SANDBOX_SKILLS_DIR}/${path.posix.basename(skillName)}`;
}

/**
 * Read each skill's SKILL.md from the real filesystem and write it into the
 * just-bash VFS at the seeded path. Returns a path-remapping that callers
 * (e.g. SessionScopedResourceLoader) apply so Pi's `formatSkillsForPrompt`
 * outputs VFS paths in `<location>`.
 *
 * Skills whose SKILL.md cannot be read on disk are silently skipped — the
 * caller can detect this by comparing input length to output map size.
 */
export async function seedSkillsIntoSandbox(
  bash: Bash,
  skills: readonly SeedableSkill[],
): Promise<SkillPathRemapping> {
  const filePathByOriginalFilePath = new Map<string, string>();
  const baseDirByOriginalBaseDir = new Map<string, string>();

  for (const skill of skills) {
    let body: string;
    try {
      body = await readFile(skill.filePath, 'utf8');
    } catch {
      continue;
    }
    const vfsFile = vfsSkillFilePath(skill.name, path.posix.basename(skill.filePath));
    const vfsDir = vfsSkillBaseDir(skill.name);
    await bash.fs.mkdir(vfsDir, { recursive: true });
    await bash.fs.writeFile(vfsFile, body, 'utf8');
    filePathByOriginalFilePath.set(skill.filePath, vfsFile);
    baseDirByOriginalBaseDir.set(skill.baseDir, vfsDir);
  }

  return { filePathByOriginalFilePath, baseDirByOriginalBaseDir };
}
