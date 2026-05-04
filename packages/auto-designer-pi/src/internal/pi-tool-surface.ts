/**
 * Pi tool surface registry — the runtime contract between auto-designer and
 * upstream Pi.
 *
 * Pi 0.72 ships seven model-callable built-ins (`read`, `write`, `edit`, `ls`,
 * `find`, `grep`, `bash`). Pi's documented mechanism for sandboxing or
 * customising any of them is to register a tool with the same name through
 * the extension API — `pi.registerTool({ name: 'read', ... })` overrides the
 * built-in by name (extensions.md "Overriding Built-in Tools"). We use this
 * for every Pi built-in, each one wrapped to talk to the just-bash VFS. The
 * model's tool surface IS Pi's tool surface; no model-callable tool touches
 * the real disk.
 *
 * On top of Pi's seven we also register *auto-designer extension tools*
 * (today: `todo_write`, `validate_js`, `validate_html`) — domain helpers
 * that are not Pi tools but are sandboxed to the same VFS through the same
 * `pi.registerTool` API.
 *
 * `ToolSurface.build()` returns one `ExtensionFactory` that registers every
 * handler in the surface (sandboxed Pi overrides + auto-designer extensions),
 * plus an `allowlist` of names ready to feed `createAgentSession({ tools })`.
 *
 * The contract is enforced at runtime by `ToolSurface.build()`:
 *
 *   1. The builder reads upstream Pi's `allToolNames` Set literal at session
 *      construction time (regex against the package's own JS source — Pi does
 *      not re-export the Set on its package root). Every name found there
 *      MUST have a registered handler. Missing handlers throw with an
 *      actionable error message identifying the new built-in by name.
 *   2. Every registered handler MUST refer to a unique name. Duplicate
 *      registrations throw.
 *   3. Every `'sandboxed-pi'` handler's name MUST match a known Pi built-in.
 *      Stale registrations (e.g. for a tool Pi has since removed) throw.
 *
 * This means: the next time someone bumps `@mariozechner/pi-coding-agent` and
 * Pi adds a tool, the very first attempt to start a hypothesis design session
 * throws a clear error pointing at this file. There is no documentation-only
 * promise to remember.
 *
 * Extending the surface (adding a new auto-designer-extension tool, or
 * sandboxing a newly-added Pi built-in) is a single `.add({ ... })` call on
 * the surface in `host.ts`. The `kind` discriminator forces you to think
 * about which class of tool you're adding.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExtensionAPI, ExtensionFactory, ToolDefinition } from './pi-types.ts';

/** A Pi 0.72.1 built-in tool name. Mirrors upstream's `allToolNames` Set. Source-of-truth check at runtime. */
export type PiBuiltinToolName = 'read' | 'write' | 'edit' | 'ls' | 'find' | 'grep' | 'bash';

/**
 * One disposition for one tool. Three kinds — choose the one that matches
 * what you're adding.
 */
export type ToolHandler =
  | {
      readonly kind: 'sandboxed-pi';
      /** Must be one of upstream Pi's built-ins; checked at build time. */
      readonly name: PiBuiltinToolName;
      /** Build the wrapped ToolDefinition that replaces Pi's stock real-FS tool. */
      readonly build: () => ToolDefinition;
    }
  | {
      readonly kind: 'excluded-pi';
      /** Must be one of upstream Pi's built-ins; checked at build time. */
      readonly name: PiBuiltinToolName;
      /** Why this Pi built-in is denied to the model. */
      readonly reason: string;
    }
  | {
      readonly kind: 'auto-designer-extension';
      /**
       * Tool name as the model will see it. NOT a Pi built-in — registered
       * via Pi's extension `registerTool` API.
       */
      readonly name: string;
      /** Called inside `ExtensionFactory` to register the tool with Pi. */
      readonly register: (api: ExtensionAPI) => void;
    };

export interface BuiltToolSurface {
  /**
   * Single extension factory to pass to the resource loader's
   * `extensionFactories`. Calls `pi.registerTool` once per surface entry
   * — sandboxed-pi handlers override the built-in by name; auto-designer
   * extension handlers register a new tool.
   */
  readonly extensionFactory: ExtensionFactory;
  /**
   * Allowlist of tool names ready to feed `createAgentSession({ tools })`.
   * The list is the union of every sandboxed-pi name and every
   * auto-designer-extension name in the surface — i.e. exactly the tools
   * the model should see.
   */
  readonly allowlist: readonly string[];
}

export class ToolSurfaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolSurfaceError';
  }
}

/**
 * Declarative tool registry. Build a surface, call `.build()`, hand the
 * result to `createAgentSession`. The build step performs the runtime
 * enforcement described in the file header.
 */
export class ToolSurface {
  private readonly handlers: ToolHandler[] = [];

  /** Add one handler. Returns `this` for chaining. */
  add(handler: ToolHandler): this {
    this.handlers.push(handler);
    return this;
  }

  /** Add many handlers. Returns `this` for chaining. */
  addAll(handlers: readonly ToolHandler[]): this {
    for (const h of handlers) this.handlers.push(h);
    return this;
  }

  /**
   * Validate the surface against upstream Pi and produce session inputs.
   *
   * Throws `ToolSurfaceError` on any of:
   *   - Two handlers with the same name.
   *   - A `sandboxed-pi` or `excluded-pi` handler whose name is not in
   *     upstream Pi's `allToolNames`.
   *   - A Pi built-in with no handler at all.
   */
  build(): BuiltToolSurface {
    this.assertUniqueNames();

    const upstreamPiNames = readUpstreamPiBuiltinNames();
    this.assertPiHandlersMatchUpstream(upstreamPiNames);

    /**
     * Convert each handler into one `pi.registerTool` call. Sandboxed-pi
     * handlers override the named built-in (Pi resolves the override by
     * name in `_refreshToolRegistry`, agent-session.js:1832-1835).
     * Auto-designer-extension handlers register a brand-new tool. Excluded
     * built-ins register nothing — they're absent from the allowlist and
     * unreachable to the model.
     */
    const registrations: Array<(api: ExtensionAPI) => void> = [];
    const allowlist: string[] = [];

    for (const handler of this.handlers) {
      switch (handler.kind) {
        case 'sandboxed-pi': {
          const tool = handler.build();
          if (tool.name !== handler.name) {
            throw new ToolSurfaceError(
              `Sandboxed Pi handler for '${handler.name}' produced a tool whose definition name is '${tool.name}'. ` +
                `Names must match — Pi resolves the override by name and the allowlist filters by name.`,
            );
          }
          registrations.push((api) => api.registerTool(tool));
          allowlist.push(handler.name);
          break;
        }
        case 'excluded-pi':
          // Intentionally absent from the allowlist; no tool registered. The
          // disposition exists so the runtime check (every Pi built-in
          // dispositioned) doesn't throw, but the model never sees this
          // tool.
          break;
        case 'auto-designer-extension':
          registrations.push(handler.register);
          allowlist.push(handler.name);
          break;
      }
    }

    const extensionFactory: ExtensionFactory = (api) => {
      for (const register of registrations) register(api);
    };

    return { extensionFactory, allowlist };
  }

  private assertUniqueNames(): void {
    const seen = new Set<string>();
    for (const h of this.handlers) {
      if (seen.has(h.name)) {
        throw new ToolSurfaceError(
          `Duplicate tool registration: '${h.name}' was added twice. ` +
            `Tool names must be unique across sandboxed-pi / excluded-pi / auto-designer-extension handlers.`,
        );
      }
      seen.add(h.name);
    }
  }

  private assertPiHandlersMatchUpstream(upstreamPiNames: ReadonlySet<string>): void {
    const handledPiNames = new Set<string>();
    for (const h of this.handlers) {
      if (h.kind !== 'sandboxed-pi' && h.kind !== 'excluded-pi') continue;
      if (!upstreamPiNames.has(h.name)) {
        throw new ToolSurfaceError(
          `Tool surface declares a Pi handler for '${h.name}', but upstream Pi (` +
            [...upstreamPiNames].sort().join(', ') +
            `) does not export a built-in by that name. ` +
            `Either remove the stale registration or correct the name.`,
        );
      }
      handledPiNames.add(h.name);
    }

    const missing = [...upstreamPiNames].filter((name) => !handledPiNames.has(name));
    if (missing.length > 0) {
      throw new ToolSurfaceError(
        `Upstream Pi exposes built-in tool(s) with no disposition in this auto-designer ` +
          `tool surface: ${missing.map((n) => `'${n}'`).join(', ')}.\n\n` +
          `For each missing tool, add ONE of the following to the surface in src/host.ts:\n` +
          `  • { kind: 'sandboxed-pi', name: '<n>', build: () => <wrapped-tool> }\n` +
          `      — a wrapped Pi tool that talks to the just-bash VFS.\n` +
          `  • { kind: 'excluded-pi', name: '<n>', reason: '<why-not>' }\n` +
          `      — explicitly deny this tool to the model.\n\n` +
          `This error means a Pi upgrade introduced a new built-in. Until you decide ` +
          `which path to take, sessions will not start — by design.`,
      );
    }
  }
}

/**
 * Read upstream Pi's `allToolNames` Set literal from the installed package's
 * own JS source. Pi does not re-export the Set on its package root, so a
 * regex against the source file is the most direct way to ask "what tools
 * does this version of Pi ship?"
 *
 * Cached after the first call — the Pi installation does not change inside a
 * single Node process.
 */
let cachedUpstreamNames: ReadonlySet<string> | undefined;
function readUpstreamPiBuiltinNames(): ReadonlySet<string> {
  if (cachedUpstreamNames) return cachedUpstreamNames;

  // Pi's package.json exports only `.` and `./hooks`, both ESM-only — so we
  // resolve the package's own entry via `import.meta.resolve`, then walk
  // relative to it to find the tools index.
  const piEntryUrl = import.meta.resolve('@mariozechner/pi-coding-agent');
  const piEntry = fileURLToPath(piEntryUrl);
  // piEntry → <pkg>/dist/index.js. The tools index sits at <pkg>/dist/core/tools/index.js.
  const piPkgDistDir = dirname(piEntry);
  const toolsIndexPath = resolve(piPkgDistDir, 'core/tools/index.js');

  let source: string;
  try {
    source = readFileSync(toolsIndexPath, 'utf8');
  } catch (cause) {
    throw new ToolSurfaceError(
      `Could not read upstream Pi tools index at ${toolsIndexPath}. ` +
        `The package layout may have changed in this Pi version — ` +
        `update readUpstreamPiBuiltinNames() in src/internal/pi-tool-surface.ts. ` +
        `Underlying error: ${(cause as Error).message}`,
    );
  }

  const match = source.match(/export\s+const\s+allToolNames\s*=\s*new\s+Set\(\[([^\]]*)\]\)/);
  if (!match) {
    throw new ToolSurfaceError(
      `Could not locate the \`allToolNames\` Set literal in ${toolsIndexPath}. ` +
        `Pi may have changed how it exposes its tool inventory — ` +
        `update readUpstreamPiBuiltinNames() in src/internal/pi-tool-surface.ts.`,
    );
  }
  const names = match[1]!
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter((s) => s.length > 0);

  cachedUpstreamNames = new Set(names);
  return cachedUpstreamNames;
}

/** Test-only: clear the cached upstream-names lookup. */
export function _resetUpstreamPiBuiltinNamesCacheForTesting(): void {
  cachedUpstreamNames = undefined;
}
