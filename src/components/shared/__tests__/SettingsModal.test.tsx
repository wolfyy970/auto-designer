/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SettingsModal from '../SettingsModal';

const appConfigState = vi.hoisted(() => ({
  autoImprove: false,
}));

vi.mock('../../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({
    data: { autoImprove: appConfigState.autoImprove },
  }),
}));

describe('SettingsModal', () => {
  afterEach(() => {
    cleanup();
    appConfigState.autoImprove = false;
  });

  it('hides evaluator settings when Auto-improve is disabled', () => {
    render(<SettingsModal open onClose={() => {}} initialTab="evaluator" />);

    expect(screen.queryByRole('tab', { name: /Evaluator defaults/i })).toBeNull();
    expect(screen.queryByText('Evaluator defaults')).toBeNull();
    expect(screen.queryByText('Evaluator')).toBeNull();
    expect(screen.queryByText('Reasoning (thinking)')).not.toBeNull();
  });

  it('shows the section tabs when Auto-improve is enabled', () => {
    appConfigState.autoImprove = true;

    render(<SettingsModal open onClose={() => {}} />);

    expect(screen.queryByRole('tab', { name: /General/i })).not.toBeNull();
    expect(screen.queryByRole('tab', { name: /Evaluator defaults/i })).not.toBeNull();
    expect(screen.queryByText('Evaluator')).not.toBeNull();
  });

  it('lists every Reasoning row with plain-English labels', () => {
    render(<SettingsModal open onClose={() => {}} initialTab="general" />);

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
