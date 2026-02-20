import { describe, it, expect } from 'vitest';
import { prepareIframeContent, renderErrorHtml } from '../iframe-utils';

describe('prepareIframeContent', () => {
  it('passes through HTML unchanged', () => {
    const html = '<!DOCTYPE html><html><body>Hi</body></html>';
    expect(prepareIframeContent(html)).toBe(html);
  });

  it('passes through any code unchanged', () => {
    const code = 'function App() { return <div>Hello</div>; }';
    expect(prepareIframeContent(code)).toBe(code);
  });
});

describe('renderErrorHtml', () => {
  it('wraps error message in HTML', () => {
    const result = renderErrorHtml('Something broke');
    expect(result).toContain('Something broke');
    expect(result).toContain('Rendering Error');
    expect(result).toContain('<!DOCTYPE html>');
  });
});
