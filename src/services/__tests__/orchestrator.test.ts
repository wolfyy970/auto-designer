import { describe, it, expect, vi } from 'vitest';
import { runAgenticBuild } from '../agent/orchestrator';
import type { GenerationProvider, ChatResponse, ProviderOptions } from '../../types/provider';
import type { ProviderModel } from '../../types/provider';

// ── Mock provider factory ─────────────────────────────────────────────

function makeMockProvider(responses: string[]): GenerationProvider {
  let callIndex = 0;
  return {
    id: 'mock',
    name: 'Mock',
    description: 'Test provider',
    supportsImages: false,
    supportsParallel: true,
    isAvailable: () => true,
    listModels: async (): Promise<ProviderModel[]> => [],
    generateChat: vi.fn(async (_messages, _opts: ProviderOptions): Promise<ChatResponse> => {
      const raw = responses[callIndex] ?? '<finish_build></finish_build>';
      callIndex++;
      return { raw };
    }),
  };
}

// ── runAgenticBuild ───────────────────────────────────────────────────

describe('runAgenticBuild', () => {
  it('writes files from write_file tool calls and finishes on finish_build', async () => {
    const provider = makeMockProvider([
      '<write_file path="index.html"><!DOCTYPE html><html></html></write_file>\n<finish_build></finish_build>',
    ]);

    const ws = await runAgenticBuild('system', 'user context', provider, {
      model: 'test-model',
    });

    expect(ws.readFile('index.html')).toBe('<!DOCTYPE html><html></html>');
    expect(ws.listFiles()).toContain('index.html');
  });

  it('handles multi-loop builds: writes one file per loop then finishes', async () => {
    const provider = makeMockProvider([
      '<write_file path="index.html"><html></html></write_file>',
      '<write_file path="styles.css">body {}</write_file>',
      '<finish_build></finish_build>',
    ]);

    const ws = await runAgenticBuild('system', 'context', provider, {
      model: 'test-model',
    });

    expect(ws.readFile('index.html')).toBe('<html></html>');
    expect(ws.readFile('styles.css')).toBe('body {}');
  });

  it('edit_file patches existing file content', async () => {
    const provider = makeMockProvider([
      '<write_file path="index.html"><div>OLD</div></write_file>',
      '<edit_file path="index.html"><search>OLD</search><replace>NEW</replace></edit_file>\n<finish_build></finish_build>',
    ]);

    const ws = await runAgenticBuild('system', 'context', provider, {
      model: 'test-model',
    });

    expect(ws.readFile('index.html')).toBe('<div>NEW</div>');
  });

  it('nudges model when no tool calls are produced', async () => {
    const provider = makeMockProvider([
      'Here is some prose with no tool calls.',
      '<write_file path="index.html">hi</write_file>\n<finish_build></finish_build>',
    ]);

    const ws = await runAgenticBuild('system', 'context', provider, {
      model: 'test-model',
    });

    expect(ws.readFile('index.html')).toBe('hi');
    // Provider should have been called twice (nudge + real response)
    expect((provider.generateChat as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('stops at maxLoops when finish_build is never called', async () => {
    // Provider always writes a file but never calls finish_build
    const infiniteProvider = makeMockProvider(
      Array.from({ length: 20 }, (_, i) => `<write_file path="file${i}.html">content</write_file>`)
    );

    const progressMessages: string[] = [];
    const ws = await runAgenticBuild('system', 'context', infiniteProvider, {
      model: 'test-model',
      maxLoops: 3,
      onProgress: (msg) => progressMessages.push(msg),
    });

    // Should have tried 3 loops and stopped
    expect((infiniteProvider.generateChat as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
    expect(progressMessages.some((m) => m.includes('max loops'))).toBe(true);
  });

  it('reports progress via onProgress callback', async () => {
    const provider = makeMockProvider([
      '<write_file path="index.html">hi</write_file>\n<finish_build></finish_build>',
    ]);

    const messages: string[] = [];
    await runAgenticBuild('system', 'context', provider, {
      model: 'test-model',
      onProgress: (msg) => messages.push(msg),
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => m.toLowerCase().includes('build'))).toBe(true);
  });

  it('skips planning pass when plannerSystemPrompt is not provided', async () => {
    const provider = makeMockProvider([
      '<write_file path="index.html">hi</write_file>\n<finish_build></finish_build>',
    ]);

    await runAgenticBuild('system', 'context', provider, {
      model: 'test-model',
    });

    // Only one call — no planner call
    expect((provider.generateChat as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('runs planning pass when plannerSystemPrompt is provided', async () => {
    const plannerResponse = JSON.stringify({
      intent: 'Bold landing page',
      palette: { primary: '#ff0000', background: '#000000' },
      typography: { display: 'Georgia', body: 'Arial' },
      layout: 'Single column, hero-first',
      files: [
        { path: 'index.html', responsibility: 'Structure', key_decisions: [] },
      ],
    });

    const provider = makeMockProvider([
      plannerResponse,
      '<write_file path="index.html">hi</write_file>\n<finish_build></finish_build>',
    ]);

    const ws = await runAgenticBuild('builder-system', 'context', provider, {
      model: 'test-model',
      plannerSystemPrompt: 'planner-system',
    });

    // Two calls: one planner, one builder
    expect((provider.generateChat as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    // First call uses planner system prompt
    const firstMessages = (provider.generateChat as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstMessages[0].content).toBe('planner-system');
    // Builder user message should include the plan context
    const secondMessages = (provider.generateChat as ReturnType<typeof vi.fn>).mock.calls[1][0];
    const builderUserMsg = secondMessages[1].content as string;
    expect(builderUserMsg).toContain('<build_plan>');
    expect(builderUserMsg).toContain('Bold landing page');

    expect(ws.readFile('index.html')).toBe('hi');
  });

  it('proceeds without plan if planner returns invalid JSON', async () => {
    const provider = makeMockProvider([
      'not valid json at all',
      '<write_file path="index.html">fallback</write_file>\n<finish_build></finish_build>',
    ]);

    const ws = await runAgenticBuild('builder-system', 'context', provider, {
      model: 'test-model',
      plannerSystemPrompt: 'planner-system',
    });

    // Should still complete successfully
    expect(ws.readFile('index.html')).toBe('fallback');
  });
});
