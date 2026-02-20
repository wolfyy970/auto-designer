export class AgentToolError extends Error {
  readonly toolName?: string;
  constructor(message: string, toolName?: string) {
    super(message);
    this.name = 'AgentToolError';
    this.toolName = toolName;
  }
}

/** Normalize an unknown caught value to a string message. */
export function normalizeError(err: unknown, fallback?: string): string {
  if (err instanceof Error) return err.message;
  return fallback ?? String(err);
}
