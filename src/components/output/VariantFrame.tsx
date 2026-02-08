import { useMemo, useState } from 'react';
import { Code, Eye } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import type { GenerationResult } from '../../types/provider';
import VariantMetadata from './VariantMetadata';

interface VariantFrameProps {
  result: GenerationResult;
  strategy: VariantStrategy;
  isPreview?: boolean;
}

function wrapReactCode(code: string): string {
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
  <script type="text/babel">
    ${code}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(typeof App !== 'undefined' ? App : () => React.createElement('div', null, 'No App component found')));
  </script>
</body>
</html>`;
}

export default function VariantFrame({
  result,
  strategy,
  isPreview = false,
}: VariantFrameProps) {
  const [showSource, setShowSource] = useState(false);

  const htmlContent = useMemo(() => {
    if (!result.code) {
      console.log('[VariantFrame] No code available');
      return '';
    }

    try {
      // Determine if this is React code (improved detection)
      const codeStr = result.code.trim();
      const isReact =
        codeStr.includes('function App') ||
        codeStr.includes('const App') ||
        codeStr.includes('export default App') ||
        codeStr.includes('export default function') ||
        codeStr.includes('export default () =>') ||
        /^(function|const|let|var)\s+App/.test(codeStr);

      const isHtml = codeStr.startsWith('<!') || codeStr.toLowerCase().startsWith('<html');

      console.log('[VariantFrame] Preparing content:', {
        isReact,
        isHtml,
        codeLength: result.code.length,
        codePreview: result.code.substring(0, 100) + '...'
      });

      const html = isReact && !isHtml
        ? wrapReactCode(result.code)
        : result.code;

      console.log('[VariantFrame] HTML content prepared for rendering');
      return html;
    } catch (error) {
      console.error('[VariantFrame] Error preparing content:', error);
      return `
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui; padding: 20px; color: #dc2626;">
            <h3>Rendering Error</h3>
            <pre style="background: #fee; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
          </body>
        </html>
      `;
    }
  }, [result.code]);

  if (!result.code) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <VariantMetadata strategy={strategy} result={result} />

      {!isPreview && (
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setShowSource(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              !showSource
                ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye size={12} />
            Preview
          </button>
          <button
            onClick={() => setShowSource(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              showSource
                ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code size={12} />
            Source
          </button>
        </div>
      )}

      {isPreview || showSource ? (
        <pre className="max-h-[1200px] overflow-auto whitespace-pre-wrap bg-gray-50 px-4 py-3 text-xs text-gray-700">
          {result.code}
        </pre>
      ) : (
        <iframe
          srcDoc={htmlContent}
          sandbox="allow-scripts"
          className="h-[1200px] w-full border-0 bg-white"
          title={`Variant: ${strategy.name}`}
        />
      )}
    </div>
  );
}
