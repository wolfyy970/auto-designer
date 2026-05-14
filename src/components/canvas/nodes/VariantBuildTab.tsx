import { RF_INTERACTIVE } from '../../../constants/canvas';
import { CanvasMarkdown } from '../variant-run/CanvasMarkdown';

const BUILD_MD_FILENAME = 'BUILD.md';

type Props = {
  files: Record<string, string>;
};

/**
 * Renders the agent-authored `BUILD.md` retrospective: scope, working features
 * with usage notes, and stubbed features. Reuses the canvas's existing
 * Streamdown typography overrides so headings and prose match the rest of the
 * canvas. Empty state when the agent did not (or could not) write the file.
 */
export function VariantBuildTab({ files }: Props) {
  const buildMd = files[BUILD_MD_FILENAME];

  if (!buildMd || buildMd.trim().length === 0) {
    return (
      <div
        className={`${RF_INTERACTIVE} flex flex-1 items-center justify-center bg-bg p-3`}
      >
        <p className="text-micro text-fg-muted">No build report for this run.</p>
      </div>
    );
  }

  return (
    <div className={`${RF_INTERACTIVE} flex-1 overflow-auto bg-bg p-3`}>
      <CanvasMarkdown mode="static" isAnimating={false} className="canvas-markdown">
        {buildMd}
      </CanvasMarkdown>
    </div>
  );
}
