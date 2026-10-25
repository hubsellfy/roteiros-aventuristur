/**
 * Aventuristur: pure helpers for the trip retention routine (LGPD).
 * The routine erases a trip, and the files attached to it, a fixed number of
 * months after its end date.
 */

export const MAX_RETENTION_MONTHS = 120;

export type RetentionConfig =
  { kind: 'disabled' } | { kind: 'invalid'; reason: string } | { kind: 'enabled'; months: number; dryRun: boolean };

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['', '0', 'false', 'off', 'no']);

/**
 * RETENTION_MONTHS unset or blank = routine off. A value that is not a whole number
 * between 1 and 120 is refused (never guessed), so a typo cannot erase data early.
 * RETENTION_DRY_RUN defaults to true when the routine is on: erasing needs an
 * explicit RETENTION_DRY_RUN=false.
 */
export function parseRetentionConfig(env: { RETENTION_MONTHS?: string; RETENTION_DRY_RUN?: string }): RetentionConfig {
  const rawMonths = env.RETENTION_MONTHS?.trim() ?? '';
  if (rawMonths === '') return { kind: 'disabled' };
  if (!/^\d+$/.test(rawMonths))
    return { kind: 'invalid', reason: `RETENTION_MONTHS="${rawMonths}" is not a whole number` };
  const months = Number(rawMonths);
  if (months < 1 || months > MAX_RETENTION_MONTHS) {
    return { kind: 'invalid', reason: `RETENTION_MONTHS=${months} is outside 1..${MAX_RETENTION_MONTHS}` };
  }

  const rawDry = (env.RETENTION_DRY_RUN ?? 'true').trim().toLowerCase();
  if (!TRUE_VALUES.has(rawDry) && !FALSE_VALUES.has(rawDry)) {
    return { kind: 'invalid', reason: `RETENTION_DRY_RUN="${rawDry}" is not a boolean` };
  }
  const dryRun = rawDry === '' ? true : TRUE_VALUES.has(rawDry);
  return { kind: 'enabled', months, dryRun };
}

/** Last day kept: trips whose end date is strictly before it are expired. Format YYYY-MM-DD (UTC). */
export function retentionCutoff(now: Date, months: number): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - months;
  const day = now.getUTCDate();
  // Clamp to the last day of the target month (31 Mar minus 1 month = 28/29 Feb).
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cutoff = new Date(Date.UTC(year, month, Math.min(day, lastDay)));
  return cutoff.toISOString().slice(0, 10);
}
