/**
 * getActiveNoticesFor against a stubbed database and a small registry: ordering by
 * priority, severity and date, the per-version dismissal rule, and the DTO shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  user: { login_count: 5, first_seen_version: '1.0.0', role: 'user' } as { login_count: number; first_seen_version: string; role: string } | undefined,
  dismissals: [] as Array<{ notice_id: string; dismissed_app_version: string | null }>,
  runs: [] as unknown[][],
}));

vi.mock('../../../src/db/database.js', () => ({
  db: {
    prepare: (sql: string) => ({
      get: () => (sql.includes('FROM users') ? state.user : { count: 1 }),
      all: () => state.dismissals,
      run: (...args: unknown[]) => { state.runs.push(args); },
    }),
  },
}));

vi.mock('../../../src/systemNotices/registry.js', () => {
  const base = { display: 'modal', dismissible: true, conditions: [{ kind: 'always' }], bodyKey: 'b' };
  return {
    SYSTEM_NOTICES: [
      { ...base, id: 'low-old', severity: 'info', titleKey: 't', publishedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: 'low-new', severity: 'info', titleKey: 't', publishedAt: '2026-03-01T00:00:00Z' },
      { ...base, id: 'warn', severity: 'warn', titleKey: 't', publishedAt: '2026-02-01T00:00:00Z' },
      { ...base, id: 'critical', severity: 'critical', titleKey: 't', publishedAt: '2026-02-01T00:00:00Z' },
      { ...base, id: 'pinned', severity: 'info', priority: 10, titleKey: 't', publishedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: 'per-version', severity: 'info', recurring: 'per-version', titleKey: 't', publishedAt: '2025-01-01T00:00:00Z' },
    ],
  };
});

import { getActiveNoticesFor, dismissNotice, getCurrentAppVersion } from '../../../src/systemNotices/service.js';

beforeEach(() => {
  state.user = { login_count: 5, first_seen_version: '1.0.0', role: 'user' };
  state.dismissals = [];
  state.runs = [];
});

describe('getActiveNoticesFor', () => {
  it('orders by priority, then severity, then newest first, and strips internal fields', () => {
    const result = getActiveNoticesFor(1, () => false);
    expect(result.map(n => n.id)).toEqual(['pinned', 'critical', 'warn', 'low-new', 'low-old', 'per-version']);
    expect(result[0]).not.toHaveProperty('conditions');
    expect(result[0]).not.toHaveProperty('publishedAt');
    expect(result[0]).not.toHaveProperty('priority');
  });

  it('returns nothing for an unknown user', () => {
    state.user = undefined;
    expect(getActiveNoticesFor(99, () => false)).toEqual([]);
  });

  it('hides a dismissed notice for good, but a per-version one only until the version moves on', () => {
    const current = getCurrentAppVersion();
    state.dismissals = [
      { notice_id: 'warn', dismissed_app_version: '0.0.1' },
      { notice_id: 'per-version', dismissed_app_version: current },
    ];
    let ids = getActiveNoticesFor(1, () => false).map(n => n.id);
    expect(ids).not.toContain('warn');
    expect(ids).not.toContain('per-version');

    state.dismissals = [{ notice_id: 'per-version', dismissed_app_version: null }];
    ids = getActiveNoticesFor(1, () => false).map(n => n.id);
    expect(ids).toContain('per-version');
  });
});

describe('dismissNotice', () => {
  it('records the dismissal with the running version', () => {
    expect(dismissNotice(1, 'warn')).toBe(true);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0][1]).toBe('warn');
    expect(state.runs[0][3]).toBe(getCurrentAppVersion());
  });

  it('refuses an id the registry does not know', () => {
    expect(dismissNotice(1, 'unknown')).toBe(false);
    expect(state.runs).toHaveLength(0);
  });
});
