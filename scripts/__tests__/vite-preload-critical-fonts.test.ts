/**
 * Regression net for the Vite plugin that injects `<link rel="preload">`
 * tags for critical web fonts into `index.html` at build time. Two
 * concrete failure modes worth catching:
 *   1. Vite's hashed filename format changes, or `@fontsource-variable/*`
 *      starts emitting different filenames, so the regex stops matching
 *      and the preload tags silently disappear (build still succeeds —
 *      the FOUT regression is invisible until you load the page).
 *   2. The injection logic mishandles `<head>` boundaries and corrupts
 *      `index.html` in a way that breaks first paint.
 *
 * Tests target the pure functions exported alongside the plugin —
 * `buildPreloadLinks` and `injectPreloadTags` — so they don't have to
 * spin up a real Vite context. The plugin object itself is exercised
 * end-to-end every time `pnpm exec vite build` runs.
 */
import { describe, it, expect } from 'vitest';
import {
  CRITICAL_FONT_PATTERNS,
  buildPreloadLinks,
  injectPreloadTags,
  preloadCriticalFonts,
} from '../vite-preload-critical-fonts';

describe('CRITICAL_FONT_PATTERNS', () => {
  it('matches the hashed filenames Vite emits for @fontsource-variable/fraunces and inter-tight', () => {
    // These mirror the actual `dist/assets/` filenames observed in the
    // current production build. The hash segment is 8 chars but the
    // regex tolerates any length (`.*`) to stay future-proof against
    // hash-length config changes.
    const fraunces = 'assets/fraunces-latin-wght-normal-ukD16Tqj.woff2';
    const interTight = 'assets/inter-tight-latin-wght-normal-DX-nOvPD.woff2';
    expect(CRITICAL_FONT_PATTERNS.some((re) => re.test(fraunces))).toBe(true);
    expect(CRITICAL_FONT_PATTERNS.some((re) => re.test(interTight))).toBe(true);
  });

  it('does NOT match JetBrains Mono (used only in dev/agentic-monitor — not first-paint critical)', () => {
    const jbMono = 'assets/jetbrains-mono-latin-wght-normal-B9CIFXIH.woff2';
    expect(CRITICAL_FONT_PATTERNS.some((re) => re.test(jbMono))).toBe(false);
  });

  it('does NOT match non-font assets — only `.woff2` files for the two critical families', () => {
    expect(CRITICAL_FONT_PATTERNS.some((re) => re.test('assets/fraunces-latin-wght-normal-XYZ.woff'))).toBe(false);
    expect(CRITICAL_FONT_PATTERNS.some((re) => re.test('assets/index-MQYDCGIe.css'))).toBe(false);
    expect(CRITICAL_FONT_PATTERNS.some((re) => re.test('assets/CanvasPage-21VJOVoW.js'))).toBe(false);
  });
});

describe('buildPreloadLinks', () => {
  it('returns empty string when no bundle file matches a critical pattern (no preloads to inject)', () => {
    expect(buildPreloadLinks([])).toBe('');
    expect(
      buildPreloadLinks([
        'assets/CanvasPage-abc.js',
        'assets/index-def.css',
        'assets/jetbrains-mono-latin-wght-normal-xyz.woff2',
      ]),
    ).toBe('');
  });

  it('builds one `<link rel="preload" as="font">` tag per matched file', () => {
    const tags = buildPreloadLinks([
      'assets/CanvasPage-abc.js',
      'assets/fraunces-latin-wght-normal-uk.woff2',
      'assets/inter-tight-latin-wght-normal-dx.woff2',
    ]);
    const lines = tags.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('    <link rel="preload" href="/assets/fraunces-latin-wght-normal-uk.woff2" as="font" type="font/woff2" crossorigin>');
    expect(lines[1]).toBe('    <link rel="preload" href="/assets/inter-tight-latin-wght-normal-dx.woff2" as="font" type="font/woff2" crossorigin>');
  });

  it('prefixes the href with a leading slash so it resolves from the site root regardless of route', () => {
    const tags = buildPreloadLinks(['assets/fraunces-latin-wght-normal-uk.woff2']);
    expect(tags).toContain('href="/assets/');
  });
});

describe('injectPreloadTags', () => {
  it('returns html unchanged when there are no tags to inject', () => {
    const html = '<html><head><title>X</title></head><body></body></html>';
    expect(injectPreloadTags(html, '')).toBe(html);
  });

  it('splices the tags immediately before `</head>`', () => {
    const html = '<html><head><title>X</title></head><body></body></html>';
    const tags = '    <link rel="preload" href="/x.woff2" as="font" type="font/woff2" crossorigin>';
    const out = injectPreloadTags(html, tags);
    expect(out).toContain(`${tags}\n  </head>`);
    // Confirm the original `<title>` survives and the body is untouched.
    expect(out).toContain('<title>X</title>');
    expect(out).toContain('<body></body>');
  });

  it('does not duplicate or corrupt the head when run on real index.html shape', () => {
    const html = [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <title>Designer</title>',
      '  </head>',
      '  <body><div id="root"></div></body>',
      '</html>',
    ].join('\n');
    const tags = '    <link rel="preload" href="/assets/x.woff2" as="font" type="font/woff2" crossorigin>';
    const out = injectPreloadTags(html, tags);
    // Exactly one </head>, exactly one preload link, head still well-formed.
    expect(out.match(/<\/head>/g)).toHaveLength(1);
    expect(out.match(/rel="preload"/g)).toHaveLength(1);
    expect(out).toMatch(/rel="preload"[\s\S]*<\/head>/);
  });
});

describe('preloadCriticalFonts (plugin shape)', () => {
  it('declares the right Vite plugin metadata so it runs at the right phase', () => {
    const plugin = preloadCriticalFonts();
    expect(plugin.name).toBe('preload-critical-fonts');
    expect(plugin.enforce).toBe('post');
    expect(plugin.apply).toBe('build');
  });

  it('skips transformation in dev/serve mode (no bundle context)', async () => {
    const plugin = preloadCriticalFonts();
    const handler = plugin.transformIndexHtml as {
      handler: (html: string, ctx: { bundle?: unknown }) => string | Promise<string>;
    };
    const html = '<html><head></head><body></body></html>';
    const result = await handler.handler(html, { bundle: undefined });
    expect(result).toBe(html);
  });

  it('injects preload tags when the bundle contains matching fonts', async () => {
    const plugin = preloadCriticalFonts();
    const handler = plugin.transformIndexHtml as {
      handler: (
        html: string,
        ctx: { bundle: Record<string, unknown> },
      ) => string | Promise<string>;
    };
    const html = '<html><head><title>x</title></head><body></body></html>';
    const result = await handler.handler(html, {
      bundle: {
        'assets/fraunces-latin-wght-normal-uk.woff2': {},
        'assets/CanvasPage-abc.js': {},
      },
    });
    expect(result).toContain('rel="preload"');
    expect(result).toContain('/assets/fraunces-latin-wght-normal-uk.woff2');
  });
});
