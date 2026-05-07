/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  canvasKeyboardZoomCommand,
  isEditableZoomShortcutTarget,
} from '../canvas-keyboard-zoom';

describe('canvas-keyboard-zoom', () => {
  it('maps command and control zoom shortcuts to canvas commands', () => {
    expect(canvasKeyboardZoomCommand({ key: '+', metaKey: true })).toBe('zoom-in');
    expect(canvasKeyboardZoomCommand({ key: '=', ctrlKey: true })).toBe('zoom-in');
    expect(canvasKeyboardZoomCommand({ key: '-', metaKey: true })).toBe('zoom-out');
    expect(canvasKeyboardZoomCommand({ key: '_', ctrlKey: true })).toBe('zoom-out');
    expect(canvasKeyboardZoomCommand({ key: '0', metaKey: true })).toBe('fit-view');
  });

  it('ignores non-zoom shortcuts and alternate-modified shortcuts', () => {
    expect(canvasKeyboardZoomCommand({ key: '+', altKey: true, metaKey: true })).toBeNull();
    expect(canvasKeyboardZoomCommand({ key: '+', metaKey: false, ctrlKey: false })).toBeNull();
    expect(canvasKeyboardZoomCommand({ key: '1', metaKey: true })).toBeNull();
  });

  it('detects editable shortcut targets', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <textarea><span id="textarea-child"></span></textarea>
      <button type="button"><span id="button-child"></span></button>
      <div id="editor" contenteditable="true"><span id="editor-child"></span></div>
      <div id="plain"></div>
    `;

    expect(isEditableZoomShortcutTarget(container.querySelector('textarea'))).toBe(true);
    expect(isEditableZoomShortcutTarget(container.querySelector('#button-child'))).toBe(true);
    expect(isEditableZoomShortcutTarget(container.querySelector('#editor-child'))).toBe(true);
    expect(isEditableZoomShortcutTarget(container.querySelector('#plain'))).toBe(false);
    expect(isEditableZoomShortcutTarget(null)).toBe(false);
  });
});
