import { useMemo, useState } from 'react';
import { Code, Eye, Loader2 } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import type { GenerationResult } from '../../types/provider';
import { prepareIframeContent, renderErrorHtml } from '../../lib/iframe-utils';
import { normalizeError } from '../../lib/error-utils';
import { useResultCode } from '../../hooks/useResultCode';
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
  const { code, isLoading } = useResultCode(result.id, result.status);

  const htmlContent = useMemo(() => {
    if (!code) return '';
    try {
      return prepareIframeContent(code);
    } catch (err) {
      return renderErrorHtml(normalizeError(err));
    }
  }, [code]);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <VariantMetadata strategy={strategy} result={result} />
        <div className="flex h-96 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-fg-muted" />
        </div>
      </div>
    );
  }

  if (!code) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <VariantMetadata strategy={strategy} result={result} />

      {!isPreview && (
        <div className="flex border-b border-border bg-bg">
          <button
            onClick={() => setShowSource(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              !showSource
                ? 'border-b-2 border-fg font-medium text-fg'
                : 'text-fg-secondary hover:text-fg-secondary'
            }`}
          >
            <Eye size={12} />
            Preview
          </button>
          <button
            onClick={() => setShowSource(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              showSource
                ? 'border-b-2 border-fg font-medium text-fg'
                : 'text-fg-secondary hover:text-fg-secondary'
            }`}
          >
            <Code size={12} />
            Source
          </button>
        </div>
      )}

      {isPreview || showSource ? (
        <pre className="max-h-[1200px] overflow-auto whitespace-pre-wrap bg-surface px-4 py-3 text-xs text-fg-secondary">
          {code}
        </pre>
      ) : (
        <iframe
          srcDoc={htmlContent}
          sandbox="allow-scripts"
          className="h-[1200px] w-full border-0 bg-bg"
          title={`Variant: ${strategy.name}`}
        />
      )}
    </div>
  );
}
