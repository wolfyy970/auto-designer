import type { ComponentProps } from 'react';

type StreamdownProps = ComponentProps<(typeof import('streamdown'))['Streamdown']>;

/** Default Streamdown controls for canvas markdown surfaces: hide table copy/download/fullscreen chrome. */
export function resolveCanvasMarkdownControls(
  controls: StreamdownProps['controls'],
): StreamdownProps['controls'] {
  return controls === undefined ? { table: false } : controls;
}
