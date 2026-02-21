export interface LlmLogEntry {
  id: string;
  timestamp: string;
  source: 'compiler' | 'planner' | 'builder' | 'other';
  phase?: string;
  model: string;
  provider: string;
  systemPrompt: string;
  userPrompt: string;
  response: string;
  durationMs: number;
  toolCalls?: { name: string; path?: string }[];
  error?: string;
}

const entries: LlmLogEntry[] = [];

export function logLlmCall(entry: Omit<LlmLogEntry, 'id' | 'timestamp'>): void {
  entries.push({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
}

export function getLogEntries(): LlmLogEntry[] {
  return [...entries];
}

export function clearLogEntries(): void {
  entries.length = 0;
}
