import { describe, it, expect } from 'vitest';
import { isReactCode, isHtmlCode, prepareIframeContent, wrapReactCode, renderErrorHtml } from '../iframe-utils';

describe('isReactCode', () => {
  it('detects function App declaration', () => {
    expect(isReactCode('function App() { return <div />; }')).toBe(true);
  });

  it('detects const App declaration', () => {
    expect(isReactCode('const App = () => <div />;')).toBe(true);
  });

  it('detects export default App', () => {
    expect(isReactCode('export default App;')).toBe(true);
  });

  it('detects export default function', () => {
    expect(isReactCode('export default function MyComp() {}')).toBe(true);
  });

  it('detects export default () =>', () => {
    expect(isReactCode('export default () => <div />')).toBe(true);
  });

  it('returns false for plain HTML', () => {
    expect(isReactCode('<!DOCTYPE html><html><body></body></html>')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(isReactCode('Hello world')).toBe(false);
  });
});

describe('isHtmlCode', () => {
  it('detects <!DOCTYPE', () => {
    expect(isHtmlCode('<!DOCTYPE html>')).toBe(true);
  });

  it('detects <html tag (case insensitive)', () => {
    expect(isHtmlCode('<html>')).toBe(true);
    expect(isHtmlCode('<HTML>')).toBe(true);
  });

  it('returns false for React code', () => {
    expect(isHtmlCode('function App() {}')).toBe(false);
  });
});

describe('prepareIframeContent', () => {
  it('wraps React code in HTML template', () => {
    const code = 'function App() { return <div>Hello</div>; }';
    const result = prepareIframeContent(code);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('react.production.min.js');
    expect(result).toContain('babel.min.js');
    expect(result).toContain(code);
  });

  it('passes through raw HTML unchanged', () => {
    const html = '<!DOCTYPE html><html><body>Hi</body></html>';
    expect(prepareIframeContent(html)).toBe(html);
  });

  it('passes through HTML starting with <html unchanged', () => {
    const html = '<html><body>Hi</body></html>';
    expect(prepareIframeContent(html)).toBe(html);
  });
});

describe('wrapReactCode', () => {
  it('wraps code in a full HTML document with React CDN', () => {
    const code = 'const App = () => <div />;';
    const result = wrapReactCode(code);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('react@18');
    expect(result).toContain('react-dom@18');
    expect(result).toContain('@babel/standalone');
    expect(result).toContain('<div id="root"></div>');
    expect(result).toContain(code);
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
