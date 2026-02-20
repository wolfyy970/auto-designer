import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualWorkspace } from '../agent/workspace';

describe('VirtualWorkspace', () => {
  let ws: VirtualWorkspace;

  beforeEach(() => {
    ws = new VirtualWorkspace();
  });

  // ── writeFile / readFile ──────────────────────────────────────────

  describe('writeFile and readFile', () => {
    it('writes and reads a file', () => {
      ws.writeFile('index.html', '<html></html>');
      expect(ws.readFile('index.html')).toBe('<html></html>');
    });

    it('overwrites an existing file', () => {
      ws.writeFile('index.html', 'first');
      ws.writeFile('index.html', 'second');
      expect(ws.readFile('index.html')).toBe('second');
    });

    it('normalizes leading slashes from path', () => {
      ws.writeFile('/styles.css', 'body {}');
      expect(ws.readFile('styles.css')).toBe('body {}');
    });

    it('normalizes leading backslashes from path', () => {
      ws.writeFile('\\app.js', 'console.log()');
      expect(ws.readFile('app.js')).toBe('console.log()');
    });

    it('returns undefined for a file that does not exist', () => {
      expect(ws.readFile('missing.html')).toBeUndefined();
    });

    it('stores multiple files independently', () => {
      ws.writeFile('a.html', 'a');
      ws.writeFile('b.css', 'b');
      expect(ws.readFile('a.html')).toBe('a');
      expect(ws.readFile('b.css')).toBe('b');
    });
  });

  // ── listFiles ─────────────────────────────────────────────────────

  describe('listFiles', () => {
    it('returns empty array when workspace is empty', () => {
      expect(ws.listFiles()).toEqual([]);
    });

    it('returns all written file paths', () => {
      ws.writeFile('index.html', '');
      ws.writeFile('styles.css', '');
      ws.writeFile('app.js', '');
      expect(ws.listFiles().sort()).toEqual(['app.js', 'index.html', 'styles.css']);
    });
  });

  // ── patchFile ─────────────────────────────────────────────────────

  describe('patchFile', () => {
    it('replaces a block of text in an existing file', () => {
      ws.writeFile('index.html', '<div>OLD</div>');
      const ok = ws.patchFile('index.html', 'OLD', 'NEW');
      expect(ok).toBe(true);
      expect(ws.readFile('index.html')).toBe('<div>NEW</div>');
    });

    it('returns false when file does not exist', () => {
      expect(ws.patchFile('missing.html', 'x', 'y')).toBe(false);
    });

    it('throws when search block is not found', () => {
      ws.writeFile('index.html', 'hello world');
      expect(() => ws.patchFile('index.html', 'not here', 'anything')).toThrow();
    });

    it('throws when the search block appears multiple times', () => {
      ws.writeFile('index.html', 'aaa aaa');
      expect(() => ws.patchFile('index.html', 'aaa', 'bbb')).toThrow(/2 occurrences/);
    });
  });

  // ── clear ─────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all files', () => {
      ws.writeFile('a.html', '');
      ws.writeFile('b.css', '');
      ws.clear();
      expect(ws.listFiles()).toEqual([]);
    });
  });

  // ── bundleToHtml ──────────────────────────────────────────────────

  describe('bundleToHtml', () => {
    it('returns index.html content when no CSS or JS present', () => {
      ws.writeFile('index.html', '<!DOCTYPE html><html><head></head><body></body></html>');
      expect(ws.bundleToHtml()).toContain('<!DOCTYPE html>');
    });

    it('injects CSS into <head>', () => {
      ws.writeFile('index.html', '<html><head></head><body></body></html>');
      ws.writeFile('styles.css', 'body { color: red; }');
      const result = ws.bundleToHtml();
      expect(result).toContain('<style>');
      expect(result).toContain('body { color: red; }');
      expect(result.indexOf('<style>')).toBeLessThan(result.indexOf('</head>'));
    });

    it('injects JS before </body>', () => {
      ws.writeFile('index.html', '<html><head></head><body></body></html>');
      ws.writeFile('app.js', 'console.log("hi")');
      const result = ws.bundleToHtml();
      expect(result).toContain('<script>');
      expect(result).toContain('console.log("hi")');
      expect(result.indexOf('<script>')).toBeLessThan(result.indexOf('</body>'));
    });

    it('prepends CSS when no </head> tag present', () => {
      ws.writeFile('index.html', '<html><body></body></html>');
      ws.writeFile('styles.css', 'p { color: blue; }');
      const result = ws.bundleToHtml();
      expect(result).toContain('<style>');
    });

    it('falls back to concatenation when no index.html present', () => {
      ws.writeFile('styles.css', 'body {}');
      const result = ws.bundleToHtml();
      expect(result).toContain('<!-- styles.css -->');
    });

    it('includes multiple CSS files in a single <style> block', () => {
      ws.writeFile('index.html', '<html><head></head><body></body></html>');
      ws.writeFile('base.css', ':root {}');
      ws.writeFile('theme.css', '.dark {}');
      const result = ws.bundleToHtml();
      expect(result).toContain(':root {}');
      expect(result).toContain('.dark {}');
    });
  });

  // ── validateWorkspace ───────────────────────────────────────────

  describe('validateWorkspace', () => {
    it('returns valid when all planned files are written', () => {
      ws.writeFile('index.html', '<html><head></head><body></body></html>');
      ws.writeFile('styles.css', 'body {}');
      const result = ws.validateWorkspace(['index.html', 'styles.css']);
      expect(result.valid).toBe(true);
      expect(result.missingFiles).toEqual([]);
    });

    it('returns invalid with missing files listed', () => {
      ws.writeFile('index.html', '<html><head></head><body></body></html>');
      const result = ws.validateWorkspace(['index.html', 'styles.css']);
      expect(result.valid).toBe(false);
      expect(result.missingFiles).toEqual(['styles.css']);
    });

    it('reports warnings for missing HTML structure tags', () => {
      ws.writeFile('index.html', '<div>no structure</div>');
      const result = ws.validateWorkspace(['index.html']);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns when index.html is not written', () => {
      ws.writeFile('styles.css', 'body {}');
      const result = ws.validateWorkspace(['styles.css']);
      expect(result.warnings).toContain('index.html was not written.');
    });
  });

  // ── fuzzy patchFile strategies ──────────────────────────────────

  describe('patchFile fuzzy matching', () => {
    it('matches with trimmed whitespace (LineTrimmedReplacer)', () => {
      ws.writeFile('f.css', '  .foo { color: red; }  ');
      const ok = ws.patchFile('f.css', '.foo { color: red; }', '.foo { color: blue; }');
      expect(ok).toBe(true);
      expect(ws.readFile('f.css')).toContain('blue');
    });

    it('matches with different indentation (IndentationFlexibleReplacer)', () => {
      ws.writeFile('f.js', '    console.log("hello");\n    console.log("world");');
      const ok = ws.patchFile('f.js', 'console.log("hello");\nconsole.log("world");', 'console.log("updated");');
      expect(ok).toBe(true);
      expect(ws.readFile('f.js')).toContain('updated');
    });

    it('matches trimmed block boundary (TrimmedBoundaryReplacer)', () => {
      ws.writeFile('f.html', '<div>content</div>');
      const ok = ws.patchFile('f.html', '\n  <div>content</div>\n  ', '<span>new</span>');
      expect(ok).toBe(true);
      expect(ws.readFile('f.html')).toContain('<span>new</span>');
    });
  });
});
