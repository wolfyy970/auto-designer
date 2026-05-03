import { describe, expect, it } from 'vitest';
import {
  EXTENSION_TOOL_NAMES,
  createAgentBashSandbox,
  createDesignerExtensionFactory,
  createSandboxBashTool,
  createVirtualPiCodingTools,
} from '../src/index.ts';

/**
 * Regression test for the Pi 0.72 `tools:` allowlist.
 *
 * Pi 0.72's `createAgentSession({ tools })` accepts a name-based allowlist that
 * filters BOTH custom tools AND extension-registered tools. Forgetting to add
 * an extension tool's name silently drops it from the model's tool surface —
 * the symptom reported as "todo_write seems not to be available".
 *
 * This test reconstructs the same name set host.ts feeds into the allowlist
 * and asserts the full ten-tool surface is present. If anyone adds a
 * `pi.registerTool(...)` call in the designer extension without updating
 * EXTENSION_TOOL_NAMES, this test fails.
 */
describe('Pi 0.72 tool allowlist', () => {
  it('lists all custom tools plus every extension tool', () => {
    const bash = createAgentBashSandbox();
    const onFile = () => {};
    const customTools = [...createVirtualPiCodingTools(bash, onFile), createSandboxBashTool(bash, onFile)];
    const customNames = customTools.map((t) => t.name);

    const allowlist = [...customNames, ...EXTENSION_TOOL_NAMES];

    expect(allowlist).toEqual([
      'read',
      'write',
      'edit',
      'ls',
      'find',
      'grep',
      'bash',
      'todo_write',
      'validate_js',
      'validate_html',
    ]);
  });

  it('extension tool names match what the factory actually registers', () => {
    const registered: string[] = [];
    const factory = createDesignerExtensionFactory({
      bash: createAgentBashSandbox(),
      todoState: { current: [] },
      onTodos: () => {},
    });
    factory({
      registerTool: (tool: { name: string }) => {
        registered.push(tool.name);
      },
    } as unknown as Parameters<typeof factory>[0]);

    expect(registered).toEqual([...EXTENSION_TOOL_NAMES]);
  });
});
