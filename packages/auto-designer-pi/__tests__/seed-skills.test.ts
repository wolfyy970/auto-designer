import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  SANDBOX_PROJECT_ROOT,
  buildSandboxedReadTool,
  createAgentBashSandbox,
  createSandboxToolContext,
  extractDesignFiles,
} from '../src/index.ts';
import {
  SANDBOX_SKILLS_DIR,
  seedSkillsIntoSandbox,
  vfsSkillBaseDir,
  vfsSkillFilePath,
  type SeedableSkill,
} from '../src/sandbox/seed-skills.ts';

let realFsRoot: string;
beforeEach(() => {
  realFsRoot = mkdtempSync(join(tmpdir(), 'auto-designer-pi-seed-skills-'));
});
afterEach(() => {
  rmSync(realFsRoot, { recursive: true, force: true });
});

function writeRealSkill(name: string, body: string): SeedableSkill {
  const dir = join(realFsRoot, name);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, 'SKILL.md');
  writeFileSync(filePath, body, 'utf8');
  return { name, filePath, baseDir: dir };
}

describe('seedSkillsIntoSandbox', () => {
  it('writes each SKILL.md into the VFS at the expected path', async () => {
    const bash = createAgentBashSandbox();
    const skill = writeRealSkill('design-generation', '# Design Generation\nBody here.\n');

    const remap = await seedSkillsIntoSandbox(bash, [skill]);

    const vfsPath = vfsSkillFilePath('design-generation');
    expect(vfsPath).toBe(`${SANDBOX_SKILLS_DIR}/design-generation/SKILL.md`);
    expect(vfsPath.startsWith(`${SANDBOX_PROJECT_ROOT}/`)).toBe(true);

    const body = await bash.fs.readFile(vfsPath, 'utf8');
    expect(body).toBe('# Design Generation\nBody here.\n');

    expect(remap.filePathByOriginalFilePath.get(skill.filePath)).toBe(vfsPath);
    expect(remap.baseDirByOriginalBaseDir.get(skill.baseDir)).toBe(vfsSkillBaseDir('design-generation'));
  });

  it('skips skills whose SKILL.md cannot be read from disk', async () => {
    const bash = createAgentBashSandbox();
    const real = writeRealSkill('design-quality', 'real body');
    const ghost: SeedableSkill = {
      name: 'ghost',
      filePath: join(realFsRoot, 'ghost', 'SKILL.md'),
      baseDir: join(realFsRoot, 'ghost'),
    };

    const remap = await seedSkillsIntoSandbox(bash, [real, ghost]);

    expect(remap.filePathByOriginalFilePath.size).toBe(1);
    expect(remap.filePathByOriginalFilePath.has(real.filePath)).toBe(true);
    expect(remap.filePathByOriginalFilePath.has(ghost.filePath)).toBe(false);
  });

  it("the seeded skill body is reachable through the sandbox's wrapped read tool", async () => {
    const bash = createAgentBashSandbox();
    const skill = writeRealSkill('accessibility', 'A11y guidance.');
    await seedSkillsIntoSandbox(bash, [skill]);

    const ctx = createSandboxToolContext(bash, () => {});
    const read = buildSandboxedReadTool(ctx);
    const vfsPath = vfsSkillFilePath('accessibility');

    const result = await read.execute(
      'tc-1',
      { path: vfsPath } as Parameters<typeof read.execute>[1],
      undefined,
      undefined,
      { cwd: SANDBOX_PROJECT_ROOT } as Parameters<typeof read.execute>[4],
    );

    const text = result.content.map((c: { type: string; text?: string }) => c.text ?? '').join('\n');
    expect(text).toContain('A11y guidance.');
  });

  it('extractDesignFiles excludes seeded skill paths from the design output', async () => {
    const bash = createAgentBashSandbox();
    const skill = writeRealSkill('design-generation', 'skill body');
    await seedSkillsIntoSandbox(bash, [skill]);

    // Also write a real design artifact so we know the extractor is otherwise working.
    await bash.fs.writeFile(`${SANDBOX_PROJECT_ROOT}/index.html`, '<!doctype html>', 'utf8');

    const files = await extractDesignFiles(bash);

    expect(files['index.html']).toBe('<!doctype html>');
    for (const rel of Object.keys(files)) {
      expect(rel.startsWith('.skills/')).toBe(false);
    }
  });
});
