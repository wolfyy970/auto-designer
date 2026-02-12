/** Color palette for generation badges — cycles through for G1, G2, G3, etc. */
const BADGE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { bg: 'bg-violet-100', text: 'text-violet-600' },
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-rose-100', text: 'text-rose-600' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600' },
] as const;

export function badgeColor(generation: number) {
  return BADGE_COLORS[(generation - 1) % BADGE_COLORS.length];
}
