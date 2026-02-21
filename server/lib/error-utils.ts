/** Normalize an unknown caught value to a string message. */
export function normalizeError(err: unknown, fallback?: string): string {
  if (err instanceof Error) return err.message;
  return fallback ?? String(err);
}
