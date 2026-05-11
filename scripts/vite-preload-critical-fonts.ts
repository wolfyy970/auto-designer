/**
 * Vite build-time plugin: inject `<link rel="preload" as="font">` tags
 * into `index.html` for critical web fonts.
 *
 * Why: the home-page **Designer** logo uses Fraunces, declared via
 * `@fontsource-variable/fraunces` with `font-display: swap`. Without a
 * preload hint the browser only discovers the font URL after CSS
 * parsing finishes and the rendering engine hits the `font-family` for
 * the first time — by which point the page has already painted in the
 * Georgia fallback. When the font finishes downloading the browser
 * swaps it in, producing a visible FOUT pop.
 *
 * Preloading tells the browser to fetch the font during initial HTML
 * parse, overlapping the font download with CSS download/parse, so the
 * font is in cache by the time it's needed for first paint.
 *
 * Inter Tight is the global sans for every page (canvas included), so
 * it gets the same treatment. JetBrains Mono is only used in dev /
 * agentic-monitor surfaces — not worth preloading for first paint.
 *
 * The plugin runs `enforce: 'post'` at build time only. The hashed
 * filename is resolved from the live bundle context (`ctx.bundle`), so
 * the preload tag auto-updates whenever the font asset's content hash
 * changes — no risk of a stale preload pointing at a 404.
 */
import type { Plugin } from 'vite';

/**
 * Filenames that should be preloaded. Matched against `Object.keys(ctx.bundle)`
 * post-bundling, so the patterns must align with what
 * `@fontsource-variable/*` emits as Vite asset filenames after content
 * hashing (`<font-name>-latin-wght-normal-<hash>.woff2`).
 *
 * Exported for testing — the regression we care about is the regex
 * staying in sync with the upstream filename convention.
 */
export const CRITICAL_FONT_PATTERNS: readonly RegExp[] = [
  /fraunces-latin-wght-normal-.*\.woff2$/,
  /inter-tight-latin-wght-normal-.*\.woff2$/,
];

/**
 * Build the `<link rel="preload">` markup for a set of asset filenames.
 * Pure function — exported so it's directly testable without spinning
 * up a Vite plugin context.
 */
export function buildPreloadLinks(bundleFilenames: readonly string[]): string {
  const hrefs: string[] = [];
  for (const fileName of bundleFilenames) {
    if (CRITICAL_FONT_PATTERNS.some((re) => re.test(fileName))) {
      hrefs.push(`/${fileName}`);
    }
  }
  if (hrefs.length === 0) return '';
  return hrefs
    .map(
      (href) =>
        `    <link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`,
    )
    .join('\n');
}

/**
 * Splice the preload links into the html document just before
 * `</head>`. Returns html unchanged if there are no links to inject (so
 * the document stays byte-identical when the bundle has no matching
 * fonts).
 */
export function injectPreloadTags(html: string, tags: string): string {
  if (!tags) return html;
  return html.replace('</head>', `${tags}\n  </head>`);
}

export function preloadCriticalFonts(): Plugin {
  return {
    name: 'preload-critical-fonts',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const tags = buildPreloadLinks(Object.keys(ctx.bundle));
        return injectPreloadTags(html, tags);
      },
    },
  };
}
