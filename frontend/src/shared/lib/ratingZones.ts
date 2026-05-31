// Score thresholds for rating zones (0..100 scale).
// up:   score >= up  → green (high performer)
// warn: score >= warn → yellow (acceptable)
// else: red (underperforming)
export const RATING_ZONES = {
  up: 80,
  warn: 50,
} as const
