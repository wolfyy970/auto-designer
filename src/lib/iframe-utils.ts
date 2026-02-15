/**
 * Shared iframe content preparation utilities.
 * Extracted from VariantFrame.tsx for reuse in canvas VariantNode.
 */

export function wrapReactCode(code: string): string {
  // Strip ES module syntax — Babel standalone transforms `export default` to
  // CommonJS (exports.default = ...) but there's no `exports` in the browser,
  // causing a silent ReferenceError that prevents App from rendering.
  //
  // Order matters:
  // 1. Remove import lines
  // 2. Remove standalone re-exports ("export default App;" where App is already declared)
  // 3. Convert "export default function App" → "function App"
  // 4. Convert "export default function(" → "var App = function("
  // 5. Convert "export default () =>" → "var App = () =>"
  // 6. Fallback: any remaining "export default <expr>" → "var App = <expr>"
  const cleaned = code
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+(\w+)\s*;?\s*$/gm, (_match, name) => {
      // If the identifier is already declared above, just remove the re-export line.
      // If it's not "App", alias it so the render bootstrap finds it.
      return name === 'App' ? '' : `var App = ${name};`;
    })
    .replace(/export\s+default\s+function\s+App/g, 'function App')
    .replace(/export\s+default\s+function\s*\(/g, 'var App = function(')
    .replace(/export\s+default\s+\(\)\s*=>/g, 'var App = () =>')
    .replace(/export\s+default\s+/g, 'var App = ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>var exports = {}; var module = {exports: exports};</script>
  <script type="text/babel" data-presets="react">
    ${cleaned}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(typeof App !== 'undefined' ? App : () => React.createElement('div', null, 'No App component found')));
  </script>
</body>
</html>`;
}

export function isReactCode(code: string): boolean {
  return (
    code.includes('function App') ||
    code.includes('const App') ||
    code.includes('export default App') ||
    code.includes('export default function') ||
    code.includes('export default () =>') ||
    /^(function|const|let|var)\s+App/.test(code)
  );
}

export function isHtmlCode(code: string): boolean {
  return code.startsWith('<!') || code.toLowerCase().startsWith('<html');
}

export function prepareIframeContent(code: string): string {
  const trimmed = code.trim();
  if (isReactCode(trimmed) && !isHtmlCode(trimmed)) {
    return wrapReactCode(code);
  }
  return code;
}

export function renderErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: system-ui; padding: 20px; color: #dc2626;">
    <h3>Rendering Error</h3>
    <pre style="background: #fee; padding: 10px; border-radius: 4px; overflow: auto;">${message}</pre>
  </body>
</html>`;
}

/**
 * Capture a screenshot by rendering HTML in a temporary hidden iframe
 * with `allow-scripts allow-same-origin`, then using html2canvas
 * (bundled, not CDN) from the parent window on the iframe's DOM.
 *
 * The display iframes stay locked down with just `allow-scripts`.
 * This temporary iframe only exists for the duration of capture.
 */
export function captureScreenshot(
  srcdocContent: string,
  width = 1280,
  height = 900
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Screenshot capture timed out'));
    }, 15000);

    const tempIframe = document.createElement('iframe');
    tempIframe.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:' +
      width +
      'px;height:' +
      height +
      'px;opacity:0;pointer-events:none;border:none;';
    tempIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    tempIframe.setAttribute('srcdoc', srcdocContent);

    function cleanup() {
      clearTimeout(timeout);
      tempIframe.remove();
    }

    tempIframe.addEventListener('load', () => {
      // Wait for CDN scripts (React, Babel, Tailwind) to load + React to mount
      setTimeout(async () => {
        try {
          const body = tempIframe.contentDocument?.body;
          if (!body) {
            cleanup();
            reject(new Error('Cannot access iframe document'));
            return;
          }
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(body, {
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 1,
          });
          const dataUrl = canvas.toDataURL('image/png', 0.85);
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, 3000);
    });

    document.body.appendChild(tempIframe);
  });
}
