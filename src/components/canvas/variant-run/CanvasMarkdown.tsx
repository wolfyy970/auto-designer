import { lazy, Suspense, type ComponentProps } from 'react';
import { canvasMarkdownComponents } from '../../../lib/canvas-markdown-components';
import { resolveCanvasMarkdownControls } from './canvas-markdown-controls';

const Streamdown = lazy(() =>
  import('streamdown').then((m) => ({ default: m.Streamdown })),
);

type StreamdownProps = ComponentProps<(typeof import('streamdown'))['Streamdown']>;

function StreamdownFallback() {
  return (
    <div className="rounded bg-surface-nested/30 px-2 py-1.5 font-mono text-badge text-fg-faint">
      Loading markdown…
    </div>
  );
}

/**
 * Streamdown + Mermaid are heavy (~800k min). Load only when a canvas surface
 * actually renders markdown (variant timeline, build retrospective, etc.) so
 * the main canvas bundle stays smaller. Applies the canvas's shared markdown
 * typography overrides via `canvasMarkdownComponents`.
 */
export function CanvasMarkdown({
  components,
  controls,
  ...rest
}: StreamdownProps) {
  return (
    <Suspense fallback={<StreamdownFallback />}>
      <Streamdown
        components={{ ...canvasMarkdownComponents, ...components }}
        controls={resolveCanvasMarkdownControls(controls)}
        {...rest}
      />
    </Suspense>
  );
}
