import { isNoticeVersionActive } from '../../../src/systemNotices/service.js';
import type { SystemNotice } from '../../../src/systemNotices/types.js';

import { describe, it, expect, vi } from 'vitest';

const notice = (extra: Partial<SystemNotice>): SystemNotice => ({
  id: 'window-test',
  display: 'modal',
  severity: 'info',
  titleKey: 'k.title',
  bodyKey: 'k.body',
  dismissible: true,
  conditions: [],
  publishedAt: '2026-01-01T00:00:00Z',
  ...extra,
});

describe('isNoticeVersionActive', () => {
  it('honours minVersion and maxVersion', () => {
    const n = notice({ minVersion: '4.0.0', maxVersion: '5.0.0' });
    expect(isNoticeVersionActive(n, '3.9.9')).toBe(false);
    expect(isNoticeVersionActive(n, '4.3.4')).toBe(true);
    expect(isNoticeVersionActive(n, '5.0.0')).toBe(false);
  });

  it('skips a notice with an invalid bound instead of showing it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isNoticeVersionActive(notice({ minVersion: 'not-a-version' }), '4.3.4')).toBe(false);
    expect(isNoticeVersionActive(notice({ maxVersion: 'nope' }), '4.3.4')).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
