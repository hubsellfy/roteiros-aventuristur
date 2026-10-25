/**
 * Aventuristur retention routine: configuration parsing, the cutoff date, the sweep
 * (files first, trip last, nothing erased on a dry run) and the cron job gate.
 */
import type { TripsRepository } from '../../../src/db/repositories/Trips.repository';
import type { AuditService } from '../../../src/nest/audit/audit.service';
import { parseRetentionConfig, retentionCutoff } from '../../../src/nest/retention/retention.impl';
import { RetentionJob } from '../../../src/nest/retention/retention.job';
import { RetentionService } from '../../../src/nest/retention/retention.service';
import type { CronRegistrarService } from '../../../src/nest/scheduling/cron-registrar.service';
import type { StorageService } from '../../../src/nest/storage/storage.service';
import type { TripsService } from '../../../src/nest/trips/trips.service';

import { describe, it, expect, vi, beforeEach } from 'vitest';

const logMock = vi.hoisted(() => ({
  LOG_LEVEL: 'error',
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn(),
}));
vi.mock('../../../src/nest/audit/audit-log.logger', () => logMock);

beforeEach(() => vi.clearAllMocks());

describe('parseRetentionConfig', () => {
  it('is off when RETENTION_MONTHS is unset or blank', () => {
    expect(parseRetentionConfig({})).toEqual({ kind: 'disabled' });
    expect(parseRetentionConfig({ RETENTION_MONTHS: '  ' })).toEqual({ kind: 'disabled' });
  });

  it('defaults to a dry run so erasing is always an explicit choice', () => {
    expect(parseRetentionConfig({ RETENTION_MONTHS: '12' })).toEqual({ kind: 'enabled', months: 12, dryRun: true });
    expect(parseRetentionConfig({ RETENTION_MONTHS: '12', RETENTION_DRY_RUN: 'false' })).toEqual({
      kind: 'enabled',
      months: 12,
      dryRun: false,
    });
    expect(parseRetentionConfig({ RETENTION_MONTHS: '12', RETENTION_DRY_RUN: 'NO' })).toEqual({
      kind: 'enabled',
      months: 12,
      dryRun: false,
    });
    expect(parseRetentionConfig({ RETENTION_MONTHS: '12', RETENTION_DRY_RUN: '' })).toEqual({
      kind: 'enabled',
      months: 12,
      dryRun: true,
    });
  });

  it('refuses values it cannot trust instead of guessing', () => {
    for (const months of ['abc', '1.5', '-3', '0', '121', '12m']) {
      expect(parseRetentionConfig({ RETENTION_MONTHS: months }).kind).toBe('invalid');
    }
    expect(parseRetentionConfig({ RETENTION_MONTHS: '12', RETENTION_DRY_RUN: 'maybe' }).kind).toBe('invalid');
  });
});

describe('retentionCutoff', () => {
  it('subtracts whole months', () => {
    expect(retentionCutoff(new Date('2027-10-24T12:00:00Z'), 12)).toBe('2026-10-24');
    expect(retentionCutoff(new Date('2027-01-15T00:00:00Z'), 3)).toBe('2026-10-15');
  });

  it('clamps to the last day of a shorter month', () => {
    expect(retentionCutoff(new Date('2027-03-31T00:00:00Z'), 1)).toBe('2027-02-28');
    expect(retentionCutoff(new Date('2028-03-31T00:00:00Z'), 1)).toBe('2028-02-29');
  });
});

function makeService(
  opts: {
    trips?: unknown[];
    files?: Record<number, string[]>;
    photos?: Record<number, string[]>;
    deleteFails?: boolean;
  } = {},
) {
  const trips = opts.trips ?? [];
  const listEndedBefore = vi.fn(async (_cutoff: string) => trips);
  const listStoredFileNames = vi.fn(async (id: number) => ({
    files: opts.files?.[id] ?? [],
    photos: opts.photos?.[id] ?? [],
  }));
  const storage = {
    delete: vi.fn(async () => {
      if (opts.deleteFails) throw new Error('disk error');
    }),
  };
  const tripsService = { remove: vi.fn(), broadcast: vi.fn() };
  const audit = { writeAudit: vi.fn() };
  const service = new RetentionService(
    { listEndedBefore, listStoredFileNames } as unknown as TripsRepository,
    storage as unknown as StorageService,
    tripsService as unknown as TripsService,
    audit as unknown as AuditService,
  );
  return { service, listEndedBefore, storage, tripsService, audit };
}

const NOW = new Date('2027-10-24T12:00:00Z');
const expiredTrip = { id: 7, title: 'Lisboa', end_date: '2026-09-01', cover_image: '/uploads/covers/c.jpg' };

describe('RetentionService.sweep', () => {
  it('queries trips that ended before the cutoff', async () => {
    const { service, listEndedBefore } = makeService();
    const result = await service.sweep(12, true, NOW);
    expect(result).toEqual({ cutoff: '2026-10-24', dryRun: true, found: 0, deleted: 0, failed: 0 });
    expect(listEndedBefore).toHaveBeenCalledWith('2026-10-24');
  });

  it('erases nothing on a dry run', async () => {
    const { service, storage, tripsService } = makeService({ trips: [expiredTrip], files: { 7: ['a.pdf'] } });
    const result = await service.sweep(12, true, NOW);
    expect(result.found).toBe(1);
    expect(result.deleted).toBe(0);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(tripsService.remove).not.toHaveBeenCalled();
  });

  it('deletes the files, the photos and the cover before the trip, then audits it', async () => {
    const { service, storage, tripsService, audit } = makeService({
      trips: [expiredTrip],
      files: { 7: ['a.pdf', 'b.pdf'] },
      photos: { 7: ['p.jpg'] },
    });
    const result = await service.sweep(12, false, NOW);
    expect(result).toMatchObject({ found: 1, deleted: 1, failed: 0 });
    expect(storage.delete).toHaveBeenCalledWith('files', 'a.pdf');
    expect(storage.delete).toHaveBeenCalledWith('files', 'b.pdf');
    expect(storage.delete).toHaveBeenCalledWith('photos', 'p.jpg');
    expect(storage.delete).toHaveBeenCalledWith('covers', 'c.jpg');
    expect(tripsService.remove).toHaveBeenCalledWith(7, 0, 'admin');
    expect(storage.delete.mock.invocationCallOrder.at(-1) ?? Number.NaN).toBeLessThan(
      tripsService.remove.mock.invocationCallOrder[0],
    );
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'trip.retention_delete',
        details: expect.objectContaining({ tripId: 7, files: 3 }),
      }),
    );
    expect(tripsService.broadcast).toHaveBeenCalledWith('7', 'trip:deleted', { id: 7 }, undefined);
  });

  it('keeps the trip for the next run when a file cannot be deleted', async () => {
    const { service, tripsService, audit } = makeService({
      trips: [expiredTrip],
      files: { 7: ['a.pdf'] },
      deleteFails: true,
    });
    const result = await service.sweep(12, false, NOW);
    expect(result).toMatchObject({ found: 1, deleted: 0, failed: 1 });
    expect(tripsService.remove).not.toHaveBeenCalled();
    expect(audit.writeAudit).not.toHaveBeenCalled();
    expect(logMock.logError).toHaveBeenCalled();
  });

  it('exposes the environment configuration', () => {
    const { service } = makeService();
    vi.stubEnv('RETENTION_MONTHS', '12');
    expect(service.config()).toMatchObject({ kind: 'enabled', months: 12 });
    vi.unstubAllEnvs();
  });
});

function registrarStub(enabled = true) {
  return { isEnabled: vi.fn(() => enabled), register: vi.fn(() => enabled), unregister: vi.fn() };
}

describe('RetentionJob', () => {
  const build = (config: unknown, enabled = true) => {
    const sweep = vi.fn(async () => ({ cutoff: '2026-10-24', dryRun: false, found: 2, deleted: 2, failed: 0 }));
    const retention = { config: vi.fn(() => config), sweep };
    const registrar = registrarStub(enabled);
    const job = new RetentionJob(
      retention as unknown as RetentionService,
      registrar as unknown as CronRegistrarService,
    );
    return { job, registrar, sweep };
  };

  it('registers the daily sweep at 04:10 when enabled', () => {
    const { job, registrar } = build({ kind: 'enabled', months: 12, dryRun: false });
    job.onApplicationBootstrap();
    expect(registrar.register).toHaveBeenCalledWith('trip-retention', '10 4 * * *', expect.any(Function));
  });

  it('stays off when unset, when invalid and under the test gate', () => {
    for (const [config, enabled] of [
      [{ kind: 'disabled' }, true],
      [{ kind: 'invalid', reason: 'bad' }, true],
      [{ kind: 'enabled', months: 12, dryRun: false }, false],
    ] as const) {
      const { job, registrar } = build(config, enabled);
      job.onApplicationBootstrap();
      expect(registrar.register).not.toHaveBeenCalled();
    }
    expect(logMock.logError).toHaveBeenCalledWith(expect.stringContaining('Retention disabled'));
  });

  it('runs the sweep with the configured months and mode', async () => {
    const { job, sweep } = build({ kind: 'enabled', months: 12, dryRun: false });
    await job.tick();
    expect(sweep).toHaveBeenCalledWith(12, false);
    expect(logMock.logInfo).toHaveBeenCalledWith(expect.stringContaining('2 erased'));
  });

  it('does nothing on a tick when not enabled and survives a failing sweep', async () => {
    const off = build({ kind: 'disabled' });
    await off.job.tick();
    expect(off.sweep).not.toHaveBeenCalled();

    const broken = build({ kind: 'enabled', months: 12, dryRun: false });
    broken.sweep.mockRejectedValueOnce(new Error('boom'));
    await expect(broken.job.tick()).resolves.toBeUndefined();
    expect(logMock.logError).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
