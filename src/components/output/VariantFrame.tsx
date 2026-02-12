import { useMemo, useState } from 'react';
import { Code, Eye } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import type { GenerationResult } from '../../types/provider';
import { prepareIframeContent, renderErrorHtml } from '../../lib/iframe-utils';
import VariantMetadata from './VariantMetadata';

interface VariantFrameProps {
  result: GenerationResult;
  strategy: VariantStrategy;
  isPreview?: boolean;
}

export default function VariantFrame({
  result,
  strategy,
  isPreview = false,
}: VariantFrameProps) {
  const [showSource, setShowSource] = useState(false);

  const htmlContent = useMemo(() => {
    if (!result.code) return '';
    try {
      return prepareIframeContent(result.code);
    } catch (err) {
      return renderErrorHtml(
        err instanceof Error ? err.message : String(err)
      );
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
