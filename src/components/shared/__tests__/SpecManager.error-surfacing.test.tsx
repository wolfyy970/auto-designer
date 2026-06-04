/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  saveCurrentCanvasSnapshot: vi.fn(),
  activateSavedSpecById: vi.fn(),
  activateImportedSpecFile: vi.fn(),
  startNewCanvasAfterCheckpoint: vi.fn(),
  duplicateCurrentSpec: vi.fn(),
  deleteSavedCanvas: vi.fn(),
  exportCurrentCanvas: vi.fn(),
}));

const refresh = vi.hoisted(() => vi.fn());

vi.mock('../../../services/canvas-library-session', () => session);

vi.mock('../../../hooks/useCanvasLibraryList', () => ({
  useCanvasLibraryList: () => ({ specs: [], refresh }),
}));

vi.mock('../../../stores/spec-store', () => ({
  useSpecStore: (selector: (s: { spec: { id: string; title: string } }) => unknown) =>
    selector({ spec: { id: 'active-1', title: 'Active Canvas' } }),
}));

import SpecManager from '../SpecManager';

describe('SpecManager error surfacing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('alerts when an action rejects and clears the busy state', async () => {
    session.saveCurrentCanvasSnapshot.mockRejectedValue(new Error('disk full'));

    render(<SpecManager open onClose={vi.fn()} />);
    const saveButton = screen.getByRole('button', { name: /save current/i }) as HTMLButtonElement;
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('disk full');
    });
    // busy cleared in finally → button is interactive again.
    await waitFor(() => expect(saveButton.disabled).toBe(false));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes the list and does not alert when an action succeeds', async () => {
    session.saveCurrentCanvasSnapshot.mockResolvedValue(undefined);

    render(<SpecManager open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save current/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(window.alert).not.toHaveBeenCalled();
  });
});
