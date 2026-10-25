import { Trips } from '../../../../src/db/entities/Trips.entity';
import { TripsAventuristurRepository } from '../../../../src/db/repositories/TripsAventuristur.repository';
import { withRequestContext } from '../../../../src/nest/database/request-context';
import { createSnapshotTestDb } from '../../../helpers/db-mock';
import { createTrip, createUser } from '../../../helpers/factories';
import { findRow, updateRows } from '../../../helpers/factories/rows';
import { resetTestDb } from '../../../helpers/test-db';
import { createTestOrm, type TestOrm } from '../../../helpers/test-orm';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const testDb = createSnapshotTestDb();
let t: TestOrm;
let repo: TripsAventuristurRepository;

beforeAll(async () => {
  t = await createTestOrm(testDb);
  repo = new TripsAventuristurRepository(t.em);
});
beforeEach(() => {
  resetTestDb(testDb);
  t.clear();
});
afterAll(async () => {
  await t.close();
  testDb.close();
});

const inContext = <T>(fn: () => Promise<T>) => withRequestContext(t.orm, fn);

describe('TripsAventuristurRepository — AI itinerary state', () => {
  it('TRIPAV-001: findAiState returns the owner, status and saved request; undefined for a missing trip', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    await inContext(() => repo.setAiState(trip.id, 'generating', '{"destino":"Lisboa"}'));
    expect(await inContext(() => repo.findAiState(trip.id))).toEqual({
      user_id: user.id,
      ai_status: 'generating',
      ai_request: '{"destino":"Lisboa"}',
    });
    expect(await inContext(() => repo.findAiState(999_999))).toBeUndefined();
  });

  it('TRIPAV-002: setAiState without a request keeps the saved one, and null clears the status', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    await inContext(() => repo.setAiState(trip.id, 'generating', 'pedido'));
    await inContext(() => repo.setAiState(trip.id, 'failed'));
    expect(await inContext(() => repo.findAiState(trip.id))).toMatchObject({
      ai_status: 'failed',
      ai_request: 'pedido',
    });
    await inContext(() => repo.setAiState(trip.id, null));
    expect(await inContext(() => repo.findAiState(trip.id))).toMatchObject({ ai_status: null, ai_request: 'pedido' });
  });

  it('TRIPAV-003: hasGenerating is per traveller', async () => {
    const { user: a } = createUser(testDb);
    const { user: b } = createUser(testDb);
    const trip = createTrip(testDb, a.id);
    expect(await inContext(() => repo.hasGenerating(a.id))).toBe(false);
    await inContext(() => repo.setAiState(trip.id, 'generating'));
    expect(await inContext(() => repo.hasGenerating(a.id))).toBe(true);
    expect(await inContext(() => repo.hasGenerating(b.id))).toBe(false);
  });

  it('TRIPAV-004: failAllGenerating marks only the trips still generating', async () => {
    const { user } = createUser(testDb);
    const running = createTrip(testDb, user.id);
    const done = createTrip(testDb, user.id);
    await inContext(() => repo.setAiState(running.id, 'generating'));
    await inContext(() => repo.failAllGenerating());
    expect(await inContext(() => repo.findAiState(running.id))).toMatchObject({ ai_status: 'failed' });
    expect(await inContext(() => repo.findAiState(done.id))).toMatchObject({ ai_status: null });
  });

  it('TRIPAV-005: setTitle renames the trip', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    await inContext(() => repo.setTitle(trip.id, 'Lisboa em 5 dias'));
    expect((await findRow(t.orm, Trips, { id: trip.id }))?.title).toBe('Lisboa em 5 dias');
  });
});

describe('TripsAventuristurRepository — retention', () => {
  it('TRIPAV-006: listEndedBefore returns trips that ended before the cutoff, oldest first, skipping empty dates', async () => {
    const { user } = createUser(testDb);
    const older = createTrip(testDb, user.id);
    const old = createTrip(testDb, user.id);
    const recent = createTrip(testDb, user.id);
    const open = createTrip(testDb, user.id);
    const blank = createTrip(testDb, user.id);
    await updateRows(t.orm, Trips, { id: older.id }, { end_date: '2025-01-10' });
    await updateRows(t.orm, Trips, { id: old.id }, { end_date: '2025-06-10' });
    await updateRows(t.orm, Trips, { id: recent.id }, { end_date: '2026-09-01' });
    await updateRows(t.orm, Trips, { id: open.id }, { end_date: null });
    await updateRows(t.orm, Trips, { id: blank.id }, { end_date: '' });
    const rows = await inContext(() => repo.listEndedBefore('2026-01-01'));
    expect(rows.map((r) => r.id)).toEqual([older.id, old.id]);
    expect(rows[0]).toEqual(expect.objectContaining({ end_date: '2025-01-10', title: expect.any(String) }));
  });

  it('TRIPAV-007: listStoredFileNames is empty for a trip with nothing stored', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    expect(await inContext(() => repo.listStoredFileNames(trip.id))).toEqual({ files: [], photos: [] });
  });
});
