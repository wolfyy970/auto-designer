import { describe, it, expect } from 'vitest';
import { checkArtifactCrossRefs } from '../src/internal/artifact-cross-ref';

describe('checkArtifactCrossRefs', () => {
  it('returns no issues when every JS DOM reference exists in the HTML', () => {
    const html = `<!doctype html><html><body>
      <button id="submit"></button>
      <input id="email" />
    </body></html>`;
    const js = `
      document.getElementById('submit').addEventListener('click', () => {});
      const email = document.querySelector('#email');
    `;
    expect(
      checkArtifactCrossRefs({
        htmlPath: 'index.html',
        htmlContent: html,
        jsFiles: [{ path: 'app.js', content: js }],
      }),
    ).toEqual([]);
  });

  it('flags getElementById calls referring to ids that do not exist', () => {
    const html = `<!doctype html><html><body><button id="submit"></button></body></html>`;
    const js = `document.getElementById('does-not-exist').click();`;
    const issues = checkArtifactCrossRefs({
      htmlPath: 'index.html',
      htmlContent: html,
      jsFiles: [{ path: 'app.js', content: js }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.kind).toBe('unresolved-dom-id');
    expect(issues[0]?.reference).toBe('does-not-exist');
    expect(issues[0]?.context).toContain('app.js');
  });

  it('flags querySelector / querySelectorAll with id selectors that do not exist', () => {
    const html = `<!doctype html><html><body><div id="real"></div></body></html>`;
    const js = `
      document.querySelector('#missing-one');
      document.querySelectorAll('#missing-two');
    `;
    const issues = checkArtifactCrossRefs({
      htmlPath: 'index.html',
      htmlContent: html,
      jsFiles: [{ path: 'app.js', content: js }],
    });
    expect(issues.map((i) => i.reference).sort()).toEqual(['missing-one', 'missing-two']);
  });

  it('counts ids assigned dynamically by JS (`el.id = "foo"`) as existing', () => {
    const html = `<!doctype html><html><body></body></html>`;
    const js = `
      const el = document.createElement('div');
      el.id = 'runtime-card';
      document.body.appendChild(el);
      // Later: read it back
      const found = document.getElementById('runtime-card');
    `;
    expect(
      checkArtifactCrossRefs({
        htmlPath: 'index.html',
        htmlContent: html,
        jsFiles: [{ path: 'app.js', content: js }],
      }),
    ).toEqual([]);
  });

  it('counts ids assigned via setAttribute as existing', () => {
    const html = `<!doctype html><html><body></body></html>`;
    const js = `
      const el = document.createElement('div');
      el.setAttribute('id', 'made-with-setattr');
      document.getElementById('made-with-setattr');
    `;
    expect(
      checkArtifactCrossRefs({
        htmlPath: 'index.html',
        htmlContent: html,
        jsFiles: [{ path: 'app.js', content: js }],
      }),
    ).toEqual([]);
  });

  it('checks inline <script> blocks in the HTML', () => {
    const html = `<!doctype html><html><body>
      <button id="real"></button>
      <script>document.getElementById('not-there').click();</script>
    </body></html>`;
    const issues = checkArtifactCrossRefs({
      htmlPath: 'index.html',
      htmlContent: html,
      jsFiles: [],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.context).toContain('index.html#inline-script');
    expect(issues[0]?.reference).toBe('not-there');
  });

  it('skips dynamic id literals (template interpolation or string concat)', () => {
    const html = `<!doctype html><html><body></body></html>`;
    // Dynamic refs — we cannot statically resolve them, so we must not flag.
    const js = `
      const id = 1;
      document.getElementById(\`row-\${id}\`);
      document.getElementById('row-' + id);
    `;
    expect(
      checkArtifactCrossRefs({
        htmlPath: 'index.html',
        htmlContent: html,
        jsFiles: [{ path: 'app.js', content: js }],
      }),
    ).toEqual([]);
  });

  it('does not treat dynamic HTML ids as resolving real refs', () => {
    // `id="row-${id}"` is a template literal in the HTML — adding it to the
    // resolved set would mask real unresolved refs. It must not count.
    const html = `<!doctype html><html><body>
      <div id="row-\${id}"></div>
    </body></html>`;
    const js = `document.getElementById('row-1');`;
    const issues = checkArtifactCrossRefs({
      htmlPath: 'index.html',
      htmlContent: html,
      jsFiles: [{ path: 'app.js', content: js }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.reference).toBe('row-1');
  });

  it('returns one issue per call site (no dedupe — agent sees each call)', () => {
    const html = `<!doctype html><html><body></body></html>`;
    const js = `
      document.getElementById('missing');
      document.getElementById('missing');
    `;
    const issues = checkArtifactCrossRefs({
      htmlPath: 'index.html',
      htmlContent: html,
      jsFiles: [{ path: 'app.js', content: js }],
    });
    expect(issues).toHaveLength(2);
  });
});
