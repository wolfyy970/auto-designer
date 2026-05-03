/**
 * Phase 7 D removed the canvas Model node and migrated model selections
 * into the per-task Settings store. Lockdown is now enforced at the
 * route boundary via `clampProviderModel` plus the `useTaskModel` hook
 * (which clamps lockdown-time reads). Canvas-level reconciliation has
 * no remaining work, so this is a no-op kept for any callers still
 * imported from older code paths.
 */
export function reconcileLockdownCanvasState(): void {
  // intentionally empty
}
