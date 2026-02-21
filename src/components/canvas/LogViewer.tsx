import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Copy, Check } from 'lucide-react';
import type { LlmLogEntry } from '../../api/types';
import { getLogs as apiGetLogs, clearLogs as apiClearLogs } from '../../api/client';
import Modal from '../shared/Modal';
import { FEEDBACK_DISMISS_MS } from '../../lib/constants';

const SOURCE_LABEL: Record<string, string> = {
  compiler: 'Incubator',
  planner: 'Planner',
  builder: 'Builder',
  other: 'Other',
};

const SOURCE_COLOR: Record<string, string> = {
  compiler: 'text-accent',
  planner: 'text-[#a78bfa]',
  builder: 'text-success',
  other: 'text-fg-muted',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), FEEDBACK_DISMISS_MS);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded p-1 text-fg-faint hover:bg-surface hover:text-fg-muted"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function PromptBlock({ label, content }: { label: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.slice(0, 200);
  const isLong = content.length > 200;

  return (
    <div className="rounded border border-border-subtle bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-nano font-medium text-fg-secondary hover:bg-surface-raised"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
        <span className="ml-auto text-fg-faint">{content.length.toLocaleString()} chars</span>
        <CopyButton text={content} />
      </button>
      {expanded ? (
        <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words border-t border-border-subtle px-3 py-2 font-mono text-nano leading-relaxed text-fg-secondary">
          {content}
        </pre>
      ) : isLong ? (
        <div className="border-t border-border-subtle px-3 py-2 font-mono text-nano text-fg-muted">
          {preview}…
        </div>
      ) : (
        <div className="border-t border-border-subtle px-3 py-2 font-mono text-nano text-fg-secondary">
          {content}
        </div>
      )}
    </div>
  );
}

function LogEntry({ entry }: { entry: LlmLogEntry }) {
  const [open, setOpen] = useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const durationSec = (entry.durationMs / 1000).toFixed(1);

  return (
    <div className="rounded-lg border border-border bg-surface-raised">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
      >
        {open ? <ChevronDown size={14} className="text-fg-muted" /> : <ChevronRight size={14} className="text-fg-muted" />}

        <span className={`text-xs font-semibold ${SOURCE_COLOR[entry.source] ?? 'text-fg-muted'}`}>
          {SOURCE_LABEL[entry.source] ?? entry.source}
        </span>

        {entry.phase && (
          <span className="text-nano text-fg-muted">{entry.phase}</span>
        )}

        <span className="ml-auto flex items-center gap-3">
          {entry.error && (
            <span className="rounded bg-error-subtle px-1.5 py-0.5 text-nano text-error">Error</span>
          )}
          {entry.toolCalls && entry.toolCalls.length > 0 && (
            <span className="text-nano text-fg-muted">
              {entry.toolCalls.length} tool{entry.toolCalls.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="tabular-nums text-nano text-fg-muted">{durationSec}s</span>
          <span className="text-nano text-fg-faint">{time}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-2 text-nano text-fg-muted">
            <span>Model: <strong className="text-fg-secondary">{entry.model}</strong></span>
            <span>Provider: <strong className="text-fg-secondary">{entry.provider}</strong></span>
          </div>

          {entry.error && (
            <div className="rounded bg-error-subtle px-3 py-2 text-nano text-error">
              {entry.error}
            </div>
          )}

          {entry.toolCalls && entry.toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.toolCalls.map((tc, i) => (
                <span key={i} className="rounded bg-surface px-2 py-0.5 text-nano text-fg-secondary">
                  {tc.name}{tc.path ? `: ${tc.path}` : ''}
                </span>
              ))}
            </div>
          )}

          <PromptBlock label="System Prompt" content={entry.systemPrompt} />
          <PromptBlock label="User Prompt" content={entry.userPrompt} />
          <PromptBlock label="Model Response" content={entry.response} />
        </div>
      )}
    </div>
  );
}

interface LogViewerProps {
  open: boolean;
  onClose: () => void;
}

export default function LogViewer({ open, onClose }: LogViewerProps) {
  const [entries, setEntries] = useState<LlmLogEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    apiGetLogs().then(setEntries);
  }, [open]);

  const handleClear = useCallback(() => {
    apiClearLogs().then(() => setEntries([]));
  }, []);

  const reversed = [...entries].reverse();

  return (
    <Modal open={open} onClose={onClose} title="LLM Call Log" size="xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-muted">
            {entries.length} call{entries.length !== 1 ? 's' : ''} this session
          </p>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-fg-muted hover:bg-error-subtle hover:text-error"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>

        {reversed.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-xs text-fg-muted">
            No LLM calls logged yet. Run the Incubator or generate a design to see logs here.
          </div>
        ) : (
          <div className="space-y-2">
            {reversed.map((entry) => (
              <LogEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
