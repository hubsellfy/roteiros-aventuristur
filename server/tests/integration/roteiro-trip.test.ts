import { buildApp } from '../../src/bootstrap';
import { db as testDb } from '../../src/db/database';
import { Places } from '../../src/db/entities/Places.entity';
import { Trips } from '../../src/db/entities/Trips.entity';
import { AssignmentsService } from '../../src/nest/assignments/assignments.service';
import { LlmConfigResolver } from '../../src/nest/llm-parse/llm-config.contract';
import { RoteiroChatService } from '../../src/nest/roteiro-ia/roteiro-chat.service';
import { authCookie } from '../helpers/auth';
import type { FactoryOrm } from '../helpers/factories/context';
import { findRow, findRows } from '../helpers/factories/rows';
import { makeAdmin } from '../helpers/factories/users';
import { resetRateLimits, resetTestDb } from '../helpers/test-db';
import { MikroORM } from '@mikro-orm/core';
import type { INestApplication } from '@nestjs/common';

import type { Application } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/database', async () => {
  const { createSnapshotTestDb, buildDbMock } = await import('../helpers/db-mock');
  return buildDbMock(createSnapshotTestDb());
});

let nestApp: INestApplication;
let app: Application;
let orm: FactoryOrm;

beforeAll(async () => {
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
  orm = nestApp.get(MikroORM);
});

beforeEach(async () => {
  resetTestDb(testDb);
  await resetRateLimits(nestApp);
});

afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await nestApp.close();
  testDb.close();
});

function mockPlanner() {
  const assistant = nestApp.get(RoteiroChatService);
  vi.spyOn(nestApp.get(LlmConfigResolver), 'resolve').mockResolvedValue({
    provider: 'openai',
    model: 'test-model',
    vision: 'off',
  });
  vi.spyOn(assistant, 'searchPlaces').mockImplementation(async (state) => {
    const results = Array.from({ length: 6 }, (_, i) => {
      const ref = `p${i + 1}`;
      const name = `Local de teste ${i + 1}`;
      state.known.set(ref, {
        ref,
        name,
        address: null,
        lat: -25.5 - i / 100,
        lng: -48.5,
        googlePlaceId: null,
        osmId: null,
        rating: null,
        ratingCount: null,
        openNow: null,
        summary: null,
        topReview: null,
        website: null,
        mapsUrl: null,
      });
      return { ref, name, address: null, rating: null, rating_count: null, open_now: null };
    });
    return { results };
  });
  const batch = (numbers: number[], id: string) => ({
    content: null,
    tool_calls: [
      {
        id,
        type: 'function' as const,
        function: {
          name: 'submit_itinerary',
          arguments: JSON.stringify({
            days: numbers.map((n) => ({ day_number: n, items: [{ ref: `p${n}`, time: '10:00' }] })),
          }),
        },
      },
    ],
  });
  vi.spyOn(assistant, 'complete')
    .mockResolvedValueOnce(batch([1, 2, 3], 'first'))
    .mockResolvedValueOnce(batch([4, 5, 6], 'second'));
}

async function startPlan() {
  const { user } = await makeAdmin(orm);
  const response = await request(app).post('/api/roteiro-ia/trip-plan').set('Cookie', authCookie(user.id)).send({
    destination: 'Destino de teste',
    origin: null,
    startDate: '2026-12-29',
    endDate: '2027-01-03',
    budget: null,
    budgetMode: 'person',
    travelers: 2,
    style: 'economico',
    language: 'pt-BR',
  });
  expect(response.status).toBe(202);
  return { tripId: response.body.tripId as number, userId: user.id };
}

describe('AI itinerary with a real database', () => {
  it('saves all six days after accepting two batches', async () => {
    mockPlanner();
    const { tripId, userId } = await startPlan();
    await vi.waitFor(async () => expect((await findRow(orm, Trips, { id: tripId }))?.ai_status).toBeNull(), {
      timeout: 10000,
    });
    const response = await request(app).get(`/api/trips/${tripId}/days`).set('Cookie', authCookie(userId));
    expect(response.status).toBe(200);
    expect(response.body.days).toHaveLength(6);
    expect(response.body.days.map((day: { assignments: unknown[] }) => day.assignments.length)).toEqual([
      1, 1, 1, 1, 1, 1,
    ]);
    expect(await findRows(orm, Places, { trip: tripId })).toHaveLength(6);
  });

  it('rolls back every place if saving a completed itinerary fails', async () => {
    mockPlanner();
    const assignments = nestApp.get(AssignmentsService);
    const original = assignments.createAssignment.bind(assignments);
    let calls = 0;
    vi.spyOn(assignments, 'createAssignment').mockImplementation(async (...args) => {
      if (++calls === 3) throw new Error('controlled save failure');
      return original(...args);
    });
    const { tripId, userId } = await startPlan();
    await vi.waitFor(async () => expect((await findRow(orm, Trips, { id: tripId }))?.ai_status).toBe('failed'), {
      timeout: 10000,
    });
    const response = await request(app).get(`/api/trips/${tripId}/days`).set('Cookie', authCookie(userId));
    expect(response.status).toBe(200);
    expect(response.body.days.every((day: { assignments: unknown[] }) => day.assignments.length === 0)).toBe(true);
    expect(await findRows(orm, Places, { trip: tripId })).toHaveLength(0);
  });
});
