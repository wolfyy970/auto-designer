export type CanvasKeyboardZoomCommand = 'zoom-in' | 'zoom-out' | 'fit-view';

interface KeyboardZoomEventLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

export function canvasKeyboardZoomCommand(
  event: KeyboardZoomEventLike,
): CanvasKeyboardZoomCommand | null {
  if (event.altKey || (!event.metaKey && !event.ctrlKey)) return null;

  switch (event.key) {
    case '+':
    case '=':
      return 'zoom-in';
    case '-':
    case '_':
      return 'zoom-out';
    case '0':
      return 'fit-view';
    default:
      return null;
  }
}

export function isEditableZoomShortcutTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest('input, textarea, select, button, [contenteditable="true"], [role="textbox"]')
  );
}
