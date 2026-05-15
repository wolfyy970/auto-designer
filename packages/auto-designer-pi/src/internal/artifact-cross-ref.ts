/**
 * Cross-file integrity checks for static web artifacts — the semantic layer
 * that `validate_html` (structural) and `validate_js` (syntax) don't cover.
 *
 * v1 scope: every DOM id referenced from JS (`getElementById('foo')`,
 * `querySelector('#foo')`, `querySelectorAll('#foo')`) must exist as an
 * `id="foo"` somewhere in the HTML — or be assigned dynamically by JS itself.
 *
 * Only literal-string references are checked. Calls like
 * `getElementById('row-' + id)` or `getElementById(`row-${id}`)` are skipped
 * — they're inherently dynamic and trying to validate them statically
 * produces false positives.
 *
 * Pure function — no Node / browser dependencies.
 */

export interface ArtifactCrossRefIssue {
  kind: 'unresolved-dom-id';
  /** The id referenced from JS that wasn't found in the HTML. */
  reference: string;
  /** File + brief call-site snippet so the agent can find it quickly. */
  context: string;
}

export interface ArtifactCrossRefInput {
  /** Path of the entry HTML file (for issue messages only). */
  htmlPath: string;
  /** Full content of the entry HTML file. */
  htmlContent: string;
  /** External JS files linked from the entry HTML (`<script src="…">`). */
  jsFiles: ReadonlyArray<{ path: string; content: string }>;
}

const ID_ATTR = /\bid=["']([^"']+)["']/g;
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const GET_BY_ID = /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
const QUERY_SEL_ID = /querySelector(?:All)?\s*\(\s*["']#([A-Za-z_][\w-]*)["']\s*\)/g;
const JS_ID_ASSIGN = /\.id\s*=\s*["']([^"']+)["']/g;
const JS_SET_ATTR_ID = /setAttribute\s*\(\s*["']id["']\s*,\s*["']([^"']+)["']\s*\)/g;

/** Skip ids that contain interpolation/concat markers — they're dynamic. */
function isDynamicLiteral(value: string): boolean {
  return value.includes('${') || value.includes('+');
}

export function checkArtifactCrossRefs(input: ArtifactCrossRefInput): ArtifactCrossRefIssue[] {
  const issues: ArtifactCrossRefIssue[] = [];

  const htmlIds = new Set<string>();

  // Static ids declared in markup.
  for (const m of input.htmlContent.matchAll(ID_ATTR)) {
    const id = m[1]!;
    if (!isDynamicLiteral(id)) htmlIds.add(id);
  }

  // Collect inline <script>…</script> blocks so they count as JS.
  const inlineScripts: string[] = [];
  for (const m of input.htmlContent.matchAll(INLINE_SCRIPT)) {
    inlineScripts.push(m[1] ?? '');
  }

  // Ids assigned dynamically by JS (`el.id = 'foo'` / `setAttribute('id', 'foo')`)
  // count as "exists" — the agent legitimately created them at runtime.
  const allJsSources: Array<{ src: string; label: string }> = [
    ...input.jsFiles.map((f) => ({ src: f.content, label: f.path })),
    ...inlineScripts.map((src, i) => ({ src, label: `${input.htmlPath}#inline-script-${i + 1}` })),
  ];
  for (const { src } of allJsSources) {
    for (const m of src.matchAll(JS_ID_ASSIGN)) {
      const id = m[1]!;
      if (!isDynamicLiteral(id)) htmlIds.add(id);
    }
    for (const m of src.matchAll(JS_SET_ATTR_ID)) {
      htmlIds.add(m[1]!);
    }
  }

  // Check id references.
  for (const { src, label } of allJsSources) {
    for (const m of src.matchAll(GET_BY_ID)) {
      const id = m[1]!;
      if (!htmlIds.has(id)) {
        issues.push({
          kind: 'unresolved-dom-id',
          reference: id,
          context: `${label}: getElementById('${id}')`,
        });
      }
    }
    for (const m of src.matchAll(QUERY_SEL_ID)) {
      const id = m[1]!;
      if (!htmlIds.has(id)) {
        issues.push({
          kind: 'unresolved-dom-id',
          reference: id,
          context: `${label}: querySelector('#${id}')`,
        });
      }
    }
  }

  return issues;
}
