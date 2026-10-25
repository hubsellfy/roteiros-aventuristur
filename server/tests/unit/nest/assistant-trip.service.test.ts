import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';

const safeFetchLlm = vi.fn();
const limits = vi.hoisted(() => ({ plan: 5 }));
vi.mock('../../../src/app-config', async () => {
  const actual = await vi.importActual<typeof import('../../../src/app-config')>('../../../src/app-config');
  return { ...actual, readEnv: () => ({ ...actual.readEnv(), integrations: { ...actual.readEnv().integrations, assistantDailyLimit: 40, assistantPlanDailyLimit: limits.plan } }) };
});
vi.mock('../../../src/utils/ssrfGuard', () => ({ safeFetchLlm: (...a: unknown[]) => safeFetchLlm(...a) }));

import { AssistantService } from '../../../src/nest/assistant/assistant.service';
import { AssistantTripService, parseItinerary } from '../../../src/nest/assistant/assistant-trip.service';
import type { KnownPlace } from '../../../src/nest/assistant/assistant.tools';

const PLACES = [
  { name: 'Praça', address: 'Centro', lat: -25.5, lng: -48.5, google_place_id: 'g1', rating: 4.5, rating_count: 10 },
  { name: 'Museu', address: 'Rua B', lat: -25.51, lng: -48.51, google_place_id: 'g2', rating: 4.7, rating_count: 90 },
  { name: 'Parque', address: 'Rua C', lat: -25.52, lng: -48.52, google_place_id: 'g3', rating: 4.4, rating_count: 40 },
];

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
const answer = (message: Record<string, unknown>) => json({ choices: [{ message }] });
const toolCall = (name: string, args: Record<string, unknown>, id = 'c1') => ({
  id, type: 'function', function: { name, arguments: JSON.stringify(args) },
});

const REQUEST = {
  destination: 'Paranaguá', origin: 'Curitiba', startDate: '2026-12-01', endDate: '2026-12-02',
  budget: 2000, budgetMode: 'person' as const, travelers: 2, style: 'equilibrado' as const, language: 'pt-BR',
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function make(opts: { config?: unknown; generating?: boolean; canCreate?: boolean } = {}) {
  const maps = {
    searchPlaces: vi.fn().mockResolvedValue({ places: PLACES, source: 'google' }),
    detailsDisabled: vi.fn().mockReturnValue(true),
    getPlaceDetailsExpanded: vi.fn(),
  };
  const config = opts.config === undefined
    ? { provider: 'openai', model: 'm', baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'k', multimodal: false }
    : opts.config;
  const llm = { resolve: vi.fn().mockReturnValue(config) };
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = {
    get: vi.fn().mockImplementation((sql: string) => (opts.generating && sql.includes('ai_status') ? { 1: 1 } : undefined)),
    run: vi.fn().mockImplementation((sql: string, ...params: unknown[]) => { calls.push({ sql, params }); return { changes: 1 }; }),
    transaction: vi.fn().mockImplementation((fn: () => unknown) => fn()),
  };
  const trips = {
    can: vi.fn().mockReturnValue(opts.canCreate !== false),
    create: vi.fn().mockReturnValue({ tripId: 42 }),
  };
  const days = { list: vi.fn().mockReturnValue({ days: [{ id: 100, day_number: 1 }, { id: 101, day_number: 2 }] }) };
  const places = { create: vi.fn().mockImplementation((_t: string, b: { name: string }) => ({ id: b.name.length })) };
  const assignments = { createAssignment: vi.fn() };
  const assistant = new AssistantService(maps as never, days as never, trips as never, db as never, llm as never);
  const svc = new AssistantTripService(assistant, trips as never, days as never, places as never, assignments as never, db as never, llm as never);
  return { svc, maps, trips, db, calls, places, assignments, llm };
}

const user = { id: 1, role: 'user' };
const status = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as HttpException).getStatus(); } return 0; };

const goodSubmit = {
  title: 'Paranaguá em 2 dias',
  days: [
    { day_number: 1, title: 'Centro', items: [{ ref: 'p2', time: '14:00', duration_minutes: 90, note: 'Vá cedo' }, { ref: 'p1', time: '09:00' }] },
    { day_number: 2, items: [{ ref: 'p3', time: '10:00' }] },
  ],
};

describe('parseItinerary', () => {
  const known = new Map<string, KnownPlace>([['p1', {} as KnownPlace], ['p2', {} as KnownPlace]]);

  it('accepts a full plan and sorts the stops by time', () => {
    const r = parseItinerary({ days: [{ day_number: 1, items: [{ ref: 'p2', time: '14:00' }, { ref: 'p1', time: '09:00', duration_minutes: 5 }] }] }, 1, known);
    expect(typeof r).toBe('object');
    if (typeof r === 'string') return;
    expect(r.days[0].items.map(i => i.ref)).toEqual(['p1', 'p2']);
    expect(r.days[0].items[0].duration).toBe(15);
  });

  it.each([
    [{}, 'days must be'],
    [{ days: [{ day_number: 3, items: [] }] }, 'between 1 and 2'],
    [{ days: [{ day_number: 1, items: [{ ref: 'zz', time: '09:00' }] }] }, 'never returned'],
    [{ days: [{ day_number: 1, items: [{ ref: 'p1', time: '9h' }] }] }, 'HH:MM'],
    [{ days: [{ day_number: 1, items: [] }] }, 'no places'],
    [{ days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }, { day_number: 1, items: [{ ref: 'p2', time: '09:00' }] }] }, 'twice'],
    [{ days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }, { day_number: 2, items: [{ ref: 'p1', time: '10:00' }] }] }, 'used twice'],
    [{ days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }] }, 'cover all 2 days'],
  ])('refuses a bad submission %#', (args, reason) => {
    const r = parseItinerary(args as Record<string, unknown>, 2, known);
    expect(typeof r).toBe('string');
    expect(r).toContain(reason);
  });
});

describe('AssistantTripService', () => {
  beforeEach(() => { safeFetchLlm.mockReset(); limits.plan = 5; });

  it('creates the trip card at once, marks it as generating and builds the plan in the background', async () => {
    const { svc, trips, calls, places, assignments } = make();
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'pontos turísticos' })] }))
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('submit_itinerary', { ...goodSubmit, days: [goodSubmit.days[0], { day_number: 2, items: [{ ref: 'p3', time: '10:00' }] }] })] }));
    const res = svc.start(user, REQUEST);
    expect(res).toEqual({ tripId: 42, remaining: 4 });
    expect(trips.create).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Paranaguá', currency: 'BRL', start_date: '2026-12-01', end_date: '2026-12-02' }));
    expect(calls[0].sql).toContain("ai_status = ?");
    expect(calls[0].params.slice(0, 2)).toEqual(['generating', JSON.stringify(REQUEST)]);
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(3));
    // Day 1 is ordered by time: Praça (09:00) before Museu (14:00).
    expect(places.create.mock.calls.map(c => c[1].name)).toEqual(['Praça', 'Museu', 'Parque']);
    expect(places.create.mock.calls[0][1]).toMatchObject({ place_time: '09:00', google_place_id: 'g1' });
    expect(places.create.mock.calls[1][1]).toMatchObject({ place_time: '14:00', duration_minutes: 90, notes: 'Vá cedo' });
    expect(calls.some(c => c.sql.includes('SET title = ? WHERE id = ?') && c.params[0] === 'Paranaguá em 2 dias')).toBe(true);
    expect(calls.some(c => c.sql.includes('ai_status = NULL'))).toBe(true);
  });

  it('gives the refusal back to the model and accepts the corrected submission', async () => {
    const { svc, assignments } = make();
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'x' })] }))
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('submit_itinerary', { days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }] }, 's1')] }))
      .mockResolvedValueOnce(answer({ content: 'pronto' }))
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('submit_itinerary', { days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }, { day_number: 2, items: [{ ref: 'p2', time: '09:00' }] }] }, 's2')] }));
    svc.start(user, REQUEST);
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(2));
    const fourth = JSON.parse((safeFetchLlm.mock.calls[3][1] as { body: string }).body).messages;
    expect(JSON.stringify(fourth)).toContain('cover all 2 days');
    expect(JSON.stringify(fourth)).toContain('Call submit_itinerary');
  });

  it('marks the trip as failed and gives the use back when the AI breaks', async () => {
    const { svc, calls } = make();
    safeFetchLlm.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom', json: async () => ({}) });
    svc.start(user, REQUEST);
    await vi.waitFor(() => expect(calls.some(c => c.sql.includes("ai_status = 'failed' WHERE id"))).toBe(true));
    await flush();
    expect(svc.start({ id: 1, role: 'user' }, REQUEST).remaining).toBe(4);
  });

  it('refuses long trips, bad dates, a missing AI, no permission and parallel plans', () => {
    expect(status(() => make().svc.start(user, { ...REQUEST, endDate: '2026-12-30' }))).toBe(400);
    expect(status(() => make().svc.start(user, { ...REQUEST, endDate: '2026-11-30' }))).toBe(400);
    expect(status(() => make().svc.start(user, { ...REQUEST, startDate: '2026-13-45' }))).toBe(400);
    expect(status(() => make({ config: null }).svc.start(user, REQUEST))).toBe(503);
    expect(status(() => make({ config: { provider: 'anthropic' } }).svc.start(user, REQUEST))).toBe(503);
    expect(status(() => make({ canCreate: false }).svc.start(user, REQUEST))).toBe(403);
    expect(status(() => make({ generating: true }).svc.start(user, REQUEST))).toBe(409);
  });

  it('stops at the daily limit and treats 0 as unlimited', () => {
    limits.plan = 1;
    const { svc } = make();
    safeFetchLlm.mockReturnValue(new Promise(() => {}));
    expect(svc.start(user, REQUEST).remaining).toBe(0);
    const { db } = make();
    db.get.mockReturnValue(undefined);
    expect(status(() => svc.start(user, REQUEST))).toBe(429);
    limits.plan = 0;
    expect(make().svc.start(user, REQUEST).remaining).toBeNull();
  });

  it('retries a failed plan with the saved request, only for its owner', () => {
    const { svc, db, calls } = make();
    safeFetchLlm.mockReturnValue(new Promise(() => {}));
    db.get.mockImplementation((sql: string) => (sql.includes('SELECT user_id') ? { user_id: 1, ai_status: 'failed', ai_request: JSON.stringify(REQUEST) } : undefined));
    expect(svc.retry(1, 42)).toEqual({ tripId: 42, remaining: 4 });
    expect(calls[0].params).toEqual(['generating', 42]);
    expect(status(() => svc.retry(2, 42))).toBe(404);
    db.get.mockImplementation(() => ({ user_id: 1, ai_status: null, ai_request: null }));
    expect(status(() => svc.retry(1, 42))).toBe(409);
    db.get.mockImplementation(() => undefined);
    expect(status(() => svc.retry(1, 42))).toBe(404);
  });

  it('marks work interrupted by a restart as failed', () => {
    const { svc, calls } = make();
    svc.onModuleInit();
    expect(calls[0].sql).toContain("SET ai_status = 'failed' WHERE ai_status = 'generating'");
  });
});
