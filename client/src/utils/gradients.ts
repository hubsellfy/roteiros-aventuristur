/**
 * Vibrant two-stop cover gradients — the fallback backdrop for any entity that
 * has no photo yet (a trip, a saved place). Picked by a stable numeric id so a
 * given entity always keeps the same colour. Mirrors the dashboard trip-card
 * palette so collection cards feel of a piece with the dashboard.
 */
export const GRADIENTS = [
  'linear-gradient(135deg, #0a6fc2 0%, #074c86 100%)',
  'linear-gradient(135deg, #4aa0e6 0%, #0a6fc2 100%)',
  'linear-gradient(135deg, #ffbf3f 0%, #f0a000 100%)',
  'linear-gradient(135deg, #0c3f78 0%, #0a6fc2 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #0a6fc2 100%)',
  'linear-gradient(135deg, #f0a000 0%, #c2410c 100%)',
  'linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #0b4886 0%, #4aa0e6 100%)',
] as const

/** Deterministic gradient for a numeric id (handles negatives defensively). */
export function entityGradient(id: number): string {
  const i = ((id % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length
  return GRADIENTS[i]
}
