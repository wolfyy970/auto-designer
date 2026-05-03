/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsModal from '../SettingsModal';

const appConfigState = vi.hoisted(() => ({
  autoImprove: false,
}));

vi.mock('../../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({
    data: { autoImprove: appConfigState.autoImprove },
  }),
}));

// The TaskModelPicker hits useQuery for providers + models. Tests don't need
// real network responses; an empty QueryClient is enough to mount.
function renderModal(initialTab?: 'general' | 'evaluator') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsModal open onClose={() => {}} initialTab={initialTab} />
    </QueryClientProvider>,
  );
}

describe('SettingsModal', () => {
  afterEach(() => {
    cleanup();
    appConfigState.autoImprove = false;
  });

  it('hides evaluator settings when Auto-improve is disabled', () => {
    renderModal('evaluator');

    expect(screen.queryByRole('tab', { name: /Evaluator defaults/i })).toBeNull();
    expect(screen.queryByText('Evaluator defaults')).toBeNull();
    expect(screen.queryByText('Evaluator')).toBeNull();
    expect(screen.queryByText('Reasoning (thinking)')).not.toBeNull();
  });

  it('shows the section tabs when Auto-improve is enabled', () => {
    appConfigState.autoImprove = true;
    renderModal();

    expect(screen.queryByRole('tab', { name: /General/i })).not.toBeNull();
    expect(screen.queryByRole('tab', { name: /Evaluator defaults/i })).not.toBeNull();
    expect(screen.queryByText('Evaluator')).not.toBeNull();
  });

  it('lists every Reasoning row with plain-English labels', () => {
    renderModal('general');

    expect(screen.queryByText('Hypothesis design')).not.toBeNull();
    expect(screen.queryByText('Incubator')).not.toBeNull();
    expect(screen.queryByText('Internal context document')).not.toBeNull();
    // The Inputs row replaces the previous three per-section rows.
    const inputsLabels = screen.queryAllByText('Inputs');
    expect(inputsLabels.length).toBeGreaterThanOrEqual(1);
    // "Design system" appears in both the section heading and the Reasoning row.
    expect(screen.queryAllByText('Design system').length).toBeGreaterThanOrEqual(1);
  });
});
