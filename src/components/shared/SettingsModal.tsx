import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { DesignTokensModal } from './DesignTokensModal';
import { PartitionSlider } from './PartitionSlider';
import { TaskModelPicker } from './TaskModelPicker';
import { floatWeightsToPercents, percentsToFloatWeights } from '../../lib/partition-slider-utils';
import { useEvaluatorDefaultsStore } from '../../stores/evaluator-defaults-store';
import {
  getTaskModelDefault,
  useThinkingDefaultsStore,
} from '../../stores/thinking-defaults-store';
import { useAppConfig } from '../../hooks/useAppConfig';
import { FEATURE_LOCKDOWN } from '../../lib/feature-flags';
import {
  EVALUATOR_MAX_REVISION_ROUNDS_MAX,
  EVALUATOR_MAX_REVISION_ROUNDS_MIN,
  EVALUATOR_MAX_SCORE,
  EVALUATOR_MIN_SCORE,
} from '../../types/evaluator-settings';
import { EVALUATOR_RUBRIC_IDS, type EvaluatorRubricId } from '../../types/evaluation';
import {
  EFFORTS,
  EFFORT_DESCRIPTIONS,
  LEVEL_TO_EFFORT,
  THINKING_CONFIG_DEFAULTS,
  THINKING_TASKS,
  type Effort,
  type ThinkingTask,
} from '../../lib/thinking-defaults';

const THINKING_TASK_LABELS: Record<ThinkingTask, string> = {
  design: 'Hypothesis design',
  incubate: 'Incubator',
  'internal-context': 'Internal context document',
  inputs: 'Inputs',
  'design-system': 'Design system',
  evaluator: 'Evaluator',
};

/**
 * One-line plain-English description of what each thinking knob actually
 * controls. Shown directly under the label in Settings so the user does
 * not have to know what an "agentic Pi session" or a "task slot" is.
 */
const THINKING_TASK_DESCRIPTIONS: Record<ThinkingTask, string> = {
  design: 'Building the actual design from a hypothesis (initial pass and revision rounds).',
  incubate: 'Generating hypothesis strategies from a design brief.',
  'internal-context':
    'Synthesising a single internal context document from your design brief and inputs.',
  inputs:
    'Auto-fill for the Research & Context, Objectives & Metrics, and Design Constraints inputs.',
  'design-system': 'Extracting a Google DESIGN.md from a design system source.',
  evaluator: 'Scoring designs against the rubric (server-side).',
};

const RUBRIC_LABELS: Record<EvaluatorRubricId, string> = {
  design: 'Design quality',
  strategy: 'Strategy fidelity',
  implementation: 'Implementation',
  browser: 'Browser / preflight',
};

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'evaluator';
}

type Tab = 'general' | 'evaluator';

function RubricWeightsPartitionCard({
  rubricWeights,
  setRubricWeights,
}: {
  rubricWeights: Record<EvaluatorRubricId, number>;
  setRubricWeights: (patch: Partial<Record<EvaluatorRubricId, number>>) => void;
}) {
  const percents = useMemo(
    () => floatWeightsToPercents(rubricWeights, EVALUATOR_RUBRIC_IDS),
    [rubricWeights],
  );

  const onPartitionChange = useCallback(
    (p: Record<string, number>) => {
      const floats = percentsToFloatWeights(p, EVALUATOR_RUBRIC_IDS) as Record<EvaluatorRubricId, number>;
      setRubricWeights(floats);
    },
    [setRubricWeights],
  );

  const segments = useMemo(
    () =>
      EVALUATOR_RUBRIC_IDS.map((rid) => ({
        id: rid,
        label: RUBRIC_LABELS[rid],
      })),
    [],
  );

  return (
    <div className="rounded-md border border-border-subtle bg-surface/60 px-3 py-2.5">
      <span className="block text-sm font-medium text-fg">Rubric weights</span>
      <p className="mt-1 text-xs text-fg-secondary">
        Relative importance of each rubric when computing the overall score (0–5 scale). Drag the dividers or click a
        percentage to type a value—percentages always sum to 100 and are stored as weights for scoring. Defaults: 40%
        design, 30% strategy, 20% implementation, 10% browser.
      </p>
      <PartitionSlider segments={segments} values={percents} onChange={onPartitionChange} />
      <p className="mt-2 text-nano text-fg-secondary">
        Keyboard: focus a divider, then Arrow Left/Right by 1% (Shift for 5%). Same weights are renormalized on the
        server if needed.
      </p>
    </div>
  );
}

export default function SettingsModal({
  open,
  onClose,
  initialTab,
}: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('general');
  const [designTokensOpen, setDesignTokensOpen] = useState(false);
  const wasOpenRef = useRef(false);
  const { data: appConfig } = useAppConfig();
  const evaluatorEnabled = appConfig?.autoImprove ?? false;

  useEffect(() => {
    if (open && !wasOpenRef.current && initialTab && (initialTab !== 'evaluator' || evaluatorEnabled)) {
      setTab(initialTab);
    }
    wasOpenRef.current = open;
  }, [open, initialTab, evaluatorEnabled]);

  useEffect(() => {
    if (!evaluatorEnabled && tab === 'evaluator') {
      setTab('general');
    }
  }, [evaluatorEnabled, tab]);

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      size="md"
    >
      {evaluatorEnabled ? (
        <div className="-mx-5 -mt-4 mb-4 border-b border-border px-5 py-3">
          <div
            className="grid gap-2 rounded-md border border-border-subtle bg-bg/50 p-1 sm:grid-cols-2"
            role="tablist"
            aria-label="Settings sections"
          >
            <SettingsTabButton
              active={tab === 'general'}
              title="General"
              description="Reasoning defaults and design-system tools"
              onClick={() => setTab('general')}
            />
            <SettingsTabButton
              active={tab === 'evaluator'}
              title="Evaluator defaults"
              description="Auto-improve rounds, target score, and rubric weights"
              onClick={() => setTab('evaluator')}
            />
          </div>
        </div>
      ) : null}

      {tab === 'general' && (
        <div className="space-y-4">
          <ReasoningSection showEvaluatorTask={evaluatorEnabled} />
          {import.meta.env.DEV ? (
            <div className="rounded-md border border-border-subtle bg-surface/60 px-3 py-2.5">
              <span className="block text-sm font-medium text-fg">Design system</span>
              <p className="mt-1 text-xs text-fg-secondary">
                Browse <code className="rounded bg-surface px-1 font-mono text-nano">@theme</code> swatches, typography
                scale, and <code className="rounded bg-surface px-1 font-mono text-nano">ds-*</code> patterns in a
                scrollable reference.
              </p>
              <button
                type="button"
                onClick={() => setDesignTokensOpen(true)}
                className="ds-btn-primary-muted mt-2 w-fit"
              >
                Open design tokens kitchen sink…
              </button>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'evaluator' && <EvaluatorSettingsTab />}
    </Modal>
    {import.meta.env.DEV ? (
      <DesignTokensModal open={designTokensOpen} onClose={() => setDesignTokensOpen(false)} />
    ) : null}
    </>
  );
}

function EvaluatorSettingsTab() {
  const maxRevisionRounds = useEvaluatorDefaultsStore((s) => s.maxRevisionRounds);
  const minOverallScore = useEvaluatorDefaultsStore((s) => s.minOverallScore);
  const rubricWeights = useEvaluatorDefaultsStore((s) => s.rubricWeights);
  const setMaxRevisionRounds = useEvaluatorDefaultsStore((s) => s.setMaxRevisionRounds);
  const setMinOverallScore = useEvaluatorDefaultsStore((s) => s.setMinOverallScore);
  const setRubricWeights = useEvaluatorDefaultsStore((s) => s.setRubricWeights);

  const scoreEnabled = minOverallScore != null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-secondary">
        These apply when <span className="font-medium text-fg">Auto-improve</span> is on (evaluator + optional revision
        loop). With Auto-improve off, the server does not run evaluators—only the design agent. Per-hypothesis overrides:
        max rounds and target score on the node. Rubric weights stay here (shared across hypotheses that use
        evaluation).
      </p>
      <div className="rounded-md border border-border-subtle bg-surface/60 px-3 py-2.5">
        <span className="block text-sm font-medium text-fg">Maximum revision rounds</span>
        <p className="mt-1 text-xs text-fg-secondary">
          Hard cap on evaluator-driven revision passes after the first build + evaluation. A run ends when either
          this many rounds is used or an earlier success applies: with Target quality score on, that means the overall
          score meets your minimum and there are no hard fails; with it off, that means the revision gate clears (
          <code className="rounded bg-surface px-1 font-mono text-nano">shouldRevise: false</code>
          ).
        </p>
        <input
          type="number"
          min={EVALUATOR_MAX_REVISION_ROUNDS_MIN}
          max={EVALUATOR_MAX_REVISION_ROUNDS_MAX}
          value={maxRevisionRounds}
          onChange={(e) => setMaxRevisionRounds(Number(e.target.value))}
          className="mt-2 w-24 rounded-md border border-border bg-bg px-2 py-2 text-xs text-fg-secondary input-focus"
        />
      </div>

      <div className="rounded-md border border-border-subtle bg-surface/60 px-3 py-2.5">
        <label className="flex cursor-pointer items-start gap-2.5 select-none">
          <input
            type="checkbox"
            checked={scoreEnabled}
            onChange={(e) => {
              if (e.target.checked) setMinOverallScore(4);
              else setMinOverallScore(null);
            }}
            className="accent-accent mt-0.5 shrink-0"
          />
          <span>
            <span className="block text-sm font-medium text-fg">Target quality score</span>
            <span className="mt-0.5 block text-xs text-fg-secondary">
              When enabled, stopping for success is based on this threshold (and no hard fails), not only on the
              revision gate. The run still ends at the maximum revision rounds if the score is not reached in time.
              Score range matches server eval (0–5).
            </span>
          </span>
        </label>
        {scoreEnabled ? (
          <div className="mt-2 pl-7">
            <input
              type="number"
              min={EVALUATOR_MIN_SCORE}
              max={EVALUATOR_MAX_SCORE}
              step={0.1}
              value={minOverallScore ?? EVALUATOR_MIN_SCORE}
              onChange={(e) => setMinOverallScore(Number(e.target.value))}
              className="w-28 rounded-md border border-border bg-bg px-2 py-2 text-xs text-fg-secondary input-focus"
            />
          </div>
        ) : null}
      </div>

      <RubricWeightsPartitionCard
        rubricWeights={rubricWeights}
        setRubricWeights={setRubricWeights}
      />
    </div>
  );
}

function SettingsTabButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded px-3 py-2 text-left transition-colors input-focus ${
        active
          ? 'border border-border bg-surface-raised text-fg shadow-sm'
          : 'border border-transparent text-fg-secondary hover:bg-surface/70 hover:text-fg'
      }`}
    >
      <span className="block text-xs font-semibold leading-snug">{title}</span>
      <span className="mt-0.5 block text-nano leading-snug text-fg-muted">{description}</span>
    </button>
  );
}

const EFFORT_LABELS: Record<Effort, string> = {
  off: 'Off',
  quick: 'Quick',
  balanced: 'Balanced',
  thorough: 'Thorough',
  maximum: 'Maximum',
};

function EffortSegmentedControl({
  value,
  defaultValue,
  onChange,
  ariaLabel,
}: {
  value: Effort;
  defaultValue: Effort;
  onChange: (next: Effort | undefined) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-md border border-border bg-bg p-0.5 text-nano text-fg-secondary"
    >
      {EFFORTS.map((eff) => {
        const active = eff === value;
        return (
          <button
            key={eff}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(eff === defaultValue ? undefined : eff)}
            className={`rounded px-2 py-0.5 transition-colors input-focus ${
              active
                ? 'bg-surface-raised text-fg shadow-sm'
                : 'text-fg-muted hover:bg-surface/70 hover:text-fg-secondary'
            }`}
          >
            {EFFORT_LABELS[eff]}
          </button>
        );
      })}
    </div>
  );
}

function EffortGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-nano text-fg-muted underline-offset-2 hover:text-fg-secondary hover:underline input-focus"
        aria-expanded={open}
      >
        {open ? 'Hide effort guide' : 'What does effort mean?'}
      </button>
      {open ? (
        <dl className="mt-2 space-y-1 rounded-md border border-border-subtle bg-surface/40 px-2.5 py-2 text-nano">
          {EFFORTS.map((eff) => (
            <div key={eff} className="grid grid-cols-[5.5rem_1fr] gap-2">
              <dt className="font-medium text-fg-secondary">{EFFORT_LABELS[eff]}</dt>
              <dd className="text-fg-muted">{EFFORT_DESCRIPTIONS[eff]}</dd>
            </div>
          ))}
          <p className="pt-1 text-micro text-fg-faint">
            Models that don&rsquo;t support extended thinking ignore this setting and run as if it were Off.
          </p>
        </dl>
      ) : null}
    </div>
  );
}

function ReasoningSection({ showEvaluatorTask }: { showEvaluatorTask: boolean }) {
  const overrides = useThinkingDefaultsStore((s) => s.overrides);
  const setEffort = useThinkingDefaultsStore((s) => s.setEffort);
  const setModel = useThinkingDefaultsStore((s) => s.setModel);
  const clearModel = useThinkingDefaultsStore((s) => s.clearModel);
  const resetTask = useThinkingDefaultsStore((s) => s.resetTask);
  const resetAll = useThinkingDefaultsStore((s) => s.resetAll);
  const visibleTasks = useMemo(
    () => THINKING_TASKS.filter((task) => showEvaluatorTask || task !== 'evaluator'),
    [showEvaluatorTask],
  );
  const hasAnyCustomizations = visibleTasks.some((task) => {
    const o = overrides[task] ?? {};
    return o.effort !== undefined || o.providerId !== undefined || o.modelId !== undefined;
  });

  return (
    <div className="rounded-md border border-border-subtle bg-surface/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="block text-sm font-medium text-fg">Reasoning (thinking)</span>
        <button
          type="button"
          onClick={resetAll}
          disabled={!hasAnyCustomizations}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle px-2 py-1 text-nano font-medium text-fg-muted transition-colors input-focus hover:border-border hover:bg-surface-raised hover:text-fg-secondary disabled:cursor-default disabled:opacity-40 disabled:hover:border-border-subtle disabled:hover:bg-transparent disabled:hover:text-fg-muted"
          title="Reset all reasoning defaults"
          aria-label="Reset all reasoning defaults"
        >
          <RotateCcw size={12} aria-hidden />
          Reset all
        </button>
      </div>
      <p className="mt-1 text-xs text-fg-secondary">
        Pick a model and how hard it should think, per task. Settings is the single control panel —
        the canvas no longer needs Model nodes.
      </p>
      <EffortGuide />
      <div className="mt-3 space-y-3">
        {visibleTasks.map((task) => {
          const defaults = THINKING_CONFIG_DEFAULTS[task];
          const defaultEffort = LEVEL_TO_EFFORT[defaults.level];
          const taskModelDefault = getTaskModelDefault(task);
          const override = overrides[task] ?? {};
          const effectiveEffort: Effort = override.effort ?? defaultEffort;
          const effectiveProviderId = override.providerId ?? taskModelDefault.providerId;
          const effectiveModelId = override.modelId ?? taskModelDefault.modelId;
          const isCustomized =
            override.effort !== undefined ||
            override.providerId !== undefined ||
            override.modelId !== undefined;
          return (
            <div key={task} className="rounded-md border border-border-subtle bg-surface/40 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="block text-nano font-medium text-fg-secondary">
                    {THINKING_TASK_LABELS[task]}
                  </span>
                  <span className="mt-0.5 block text-micro text-fg-faint">
                    {THINKING_TASK_DESCRIPTIONS[task]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => resetTask(task)}
                  disabled={!isCustomized}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle text-fg-faint transition-colors input-focus hover:border-border hover:bg-surface-raised hover:text-fg-secondary disabled:cursor-default disabled:opacity-35 disabled:hover:border-border-subtle disabled:hover:bg-transparent disabled:hover:text-fg-faint"
                  title={`Reset ${THINKING_TASK_LABELS[task]}`}
                  aria-label={`Reset ${THINKING_TASK_LABELS[task]}`}
                >
                  <RotateCcw size={12} aria-hidden />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <TaskModelPicker
                  providerId={effectiveProviderId}
                  modelId={effectiveModelId}
                  defaultProviderId={taskModelDefault.providerId}
                  defaultModelId={taskModelDefault.modelId}
                  disabled={FEATURE_LOCKDOWN}
                  onChange={(next) => {
                    if (next === undefined) clearModel(task);
                    else setModel(task, next.providerId, next.modelId);
                  }}
                  ariaLabelPrefix={THINKING_TASK_LABELS[task]}
                />
                <EffortSegmentedControl
                  value={effectiveEffort}
                  defaultValue={defaultEffort}
                  onChange={(next) => setEffort(task, next)}
                  ariaLabel={`${THINKING_TASK_LABELS[task]} effort`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
