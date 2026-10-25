import { RoteiroChatService } from '../../../src/nest/roteiro-ia/roteiro-chat.service';
import type { KnownPlace } from '../../../src/nest/roteiro-ia/roteiro-ia.tools';
import { RoteiroTripService, parseItinerary } from '../../../src/nest/roteiro-ia/roteiro-trip.service';
import { HttpException } from '@nestjs/common';

import { describe, it, expect, vi, beforeEach } from 'vitest';

const safeFetchLlm = vi.fn();
const limits = vi.hoisted(() => ({ plan: 5 }));
vi.mock('../../../src/app-config', async () => {
  const actual = await vi.importActual<typeof import('../../../src/app-config')>('../../../src/app-config');
  return {
    ...actual,
    readEnv: () => ({
      ...actual.readEnv(),
      integrations: { ...actual.readEnv().integrations, assistantDailyLimit: 40, assistantPlanDailyLimit: limits.plan },
    }),
  };
});
vi.mock('../../../src/nest/database/request-context', () => ({
  withRequestContext: (_orm: unknown, fn: () => unknown) => fn(),
}));
vi.mock('../../../src/utils/ssrfGuard', () => ({ safeFetchLlm: (...a: unknown[]) => safeFetchLlm(...a) }));

const PLACES = [
  { name: 'Praça', address: 'Centro', lat: -25.5, lng: -48.5, google_place_id: 'g1', rating: 4.5, rating_count: 10 },
  { name: 'Museu', address: 'Rua B', lat: -25.51, lng: -48.51, google_place_id: 'g2', rating: 4.7, rating_count: 90 },
  { name: 'Parque', address: 'Rua C', lat: -25.52, lng: -48.52, google_place_id: 'g3', rating: 4.4, rating_count: 40 },
];

const json = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const answer = (message: Record<string, unknown>) => json({ choices: [{ message }] });
const toolCall = (name: string, args: Record<string, unknown>, id = 'c1') => ({
  id,
  type: 'function',
  function: { name, arguments: JSON.stringify(args) },
});

const REQUEST = {
  destination: 'Paranaguá',
  origin: 'Curitiba',
  startDate: '2026-12-01',
  endDate: '2026-12-02',
  budget: 2000,
  budgetMode: 'person' as const,
  travelers: 2,
  style: 'equilibrado' as const,
  language: 'pt-BR',
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function make(opts: { config?: unknown; generating?: boolean; canCreate?: boolean } = {}) {
  const maps = {
    searchPlaces: vi.fn().mockResolvedValue({ places: PLACES, source: 'google' }),
    detailsDisabled: vi.fn().mockResolvedValue(true),
    getPlaceDetailsExpanded: vi.fn(),
  };
  const config =
    opts.config === undefined
      ? { provider: 'openai', model: 'm', baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'k', multimodal: false }
      : opts.config;
  const llm = { resolve: vi.fn().mockResolvedValue(config) };
  const tripsRepo = {
    hasGenerating: vi.fn().mockResolvedValue(!!opts.generating),
    setAiState: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
    findAiState: vi.fn().mockResolvedValue(undefined),
    failAllGenerating: vi.fn().mockResolvedValue(undefined),
  };
  const uow = { transactional: vi.fn().mockImplementation((fn: () => unknown) => fn()) };
  const trips = {
    can: vi.fn().mockResolvedValue(opts.canCreate !== false),
    create: vi.fn().mockResolvedValue({ tripId: 42 }),
  };
  const days = {
    list: vi.fn().mockResolvedValue({
      days: [
        { id: 100, day_number: 1, notes: null, title: null },
        { id: 101, day_number: 2, notes: null, title: null },
      ],
    }),
    update: vi.fn(),
  };
  const places = {
    create: vi.fn().mockImplementation(async (_t: string, b: { name: string }) => ({ id: b.name.length })),
  };
  const assignments = { createAssignment: vi.fn() };
  const assistant = new RoteiroChatService(maps as never, days as never, trips as never, llm as never);
  const svc = new RoteiroTripService(
    assistant,
    trips as never,
    days as never,
    places as never,
    assignments as never,
    tripsRepo as never,
    uow as never,
    {} as never,
    llm as never,
  );
  return { svc, maps, trips, tripsRepo, places, assignments, llm };
}

const user = { id: 1, role: 'user' };
const status = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (e) {
    return (e as HttpException).getStatus();
  }
  return 0;
};

const goodSubmit = {
  title: 'Paranaguá em 2 dias',
  days: [
    {
      day_number: 1,
      title: 'Centro',
      items: [
        { ref: 'p2', time: '14:00', duration_minutes: 90, note: 'Vá cedo' },
        { ref: 'p1', time: '09:00' },
      ],
    },
    { day_number: 2, items: [{ ref: 'p3', time: '10:00' }] },
  ],
};

describe('parseItinerary', () => {
  const known = new Map<string, KnownPlace>([
    ['p1', {} as KnownPlace],
    ['p2', {} as KnownPlace],
  ]);

  it('accepts a full plan and sorts the stops by time', () => {
    const r = parseItinerary(
      {
        days: [
          {
            day_number: 1,
            items: [
              { ref: 'p2', time: '14:00' },
              { ref: 'p1', time: '09:00', duration_minutes: 5 },
            ],
          },
        ],
      },
      1,
      known,
    );
    expect(typeof r).toBe('object');
    if (typeof r === 'string') return;
    expect(r.days[0].items.map((i) => i.ref)).toEqual(['p1', 'p2']);
    expect(r.days[0].items[0].duration).toBe(15);
  });

  it.each([
    [{}, 'days must be'],
    [{ days: [{ day_number: 3, items: [] }] }, 'between 1 and 2'],
    [{ days: [{ day_number: 1, items: [{ ref: 'zz', time: '09:00' }] }] }, 'never returned'],
    [{ days: [{ day_number: 1, items: [{ ref: 'p1', time: '9h' }] }] }, 'HH:MM'],
    [{ days: [{ day_number: 1, items: [] }] }, 'no places'],
    [
      {
        days: [
          { day_number: 1, items: [{ ref: 'p1', time: '09:00' }] },
          { day_number: 1, items: [{ ref: 'p2', time: '09:00' }] },
        ],
      },
      'twice',
    ],
    [
      {
        days: [
          { day_number: 1, items: [{ ref: 'p1', time: '09:00' }] },
          { day_number: 2, items: [{ ref: 'p1', time: '10:00' }] },
        ],
      },
      'used twice',
    ],
    [{ days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }] }, 'cover all 2 days'],
  ])('refuses a bad submission %#', (args, reason) => {
    const r = parseItinerary(args as Record<string, unknown>, 2, known);
    expect(typeof r).toBe('string');
    expect(r).toContain(reason);
  });
});

describe('RoteiroTripService', () => {
  beforeEach(() => {
    safeFetchLlm.mockReset();
    limits.plan = 5;
  });

  it('creates the trip card at once, marks it as generating and builds the plan in the background', async () => {
    const { svc, trips, tripsRepo, places, assignments } = make();
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({ content: null, tool_calls: [toolCall('search_places', { query: 'pontos turísticos' })] }),
      )
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('submit_itinerary', {
              ...goodSubmit,
              days: [goodSubmit.days[0], { day_number: 2, items: [{ ref: 'p3', time: '10:00' }] }],
            }),
          ],
        }),
      );
    const res = await svc.start(user, REQUEST);
    expect(res).toEqual({ tripId: 42, remaining: 4 });
    expect(trips.create).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        title: 'Paranaguá',
        currency: 'BRL',
        start_date: '2026-12-01',
        end_date: '2026-12-02',
      }),
    );
    expect(tripsRepo.setAiState).toHaveBeenNthCalledWith(1, 42, 'generating', JSON.stringify(REQUEST));
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(3));
    // Day 1 is ordered by time: Praça (09:00) before Museu (14:00).
    expect(places.create.mock.calls.map((c) => c[1].name)).toEqual(['Praça', 'Museu', 'Parque']);
    expect(places.create.mock.calls[0][1]).toMatchObject({ place_time: '09:00', google_place_id: 'g1' });
    expect(places.create.mock.calls[1][1]).toMatchObject({
      place_time: '14:00',
      duration_minutes: 90,
      notes: 'Vá cedo',
    });
    expect(tripsRepo.setTitle).toHaveBeenCalledWith(42, 'Paranaguá em 2 dias');
    expect(tripsRepo.setAiState).toHaveBeenLastCalledWith(42, null);
  });

  it('gives the refusal back to the model and accepts the corrected submission', async () => {
    const { svc, assignments } = make();
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'x' })] }))
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('submit_itinerary', { days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }] }, 's1'),
          ],
        }),
      )
      .mockResolvedValueOnce(answer({ content: 'pronto' }))
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall(
              'submit_itinerary',
              {
                days: [
                  { day_number: 1, items: [{ ref: 'p1', time: '09:00' }] },
                  { day_number: 2, items: [{ ref: 'p2', time: '09:00' }] },
                ],
              },
              's2',
            ),
          ],
        }),
      );
    await svc.start(user, REQUEST);
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(2));
    const fourth = JSON.parse((safeFetchLlm.mock.calls[3][1] as { body: string }).body).messages;
    expect(JSON.stringify(fourth)).toContain('cover all 2 days');
    expect(JSON.stringify(fourth)).toContain('Call submit_itinerary');
  });

  it('marks the trip as failed and gives the use back when the AI breaks', async () => {
    const { svc, tripsRepo } = make();
    safeFetchLlm.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom', json: async () => ({}) });
    await svc.start(user, REQUEST);
    await vi.waitFor(() => expect(tripsRepo.setAiState).toHaveBeenCalledWith(42, 'failed'));
    await flush();
    expect((await svc.start({ id: 1, role: 'user' }, REQUEST)).remaining).toBe(4);
  });

  it('refuses long trips, bad dates, a missing AI, no permission and parallel plans', async () => {
    expect(await status(() => make().svc.start(user, { ...REQUEST, endDate: '2026-12-30' }))).toBe(400);
    expect(await status(() => make().svc.start(user, { ...REQUEST, endDate: '2026-11-30' }))).toBe(400);
    expect(await status(() => make().svc.start(user, { ...REQUEST, startDate: '2026-13-45' }))).toBe(400);
    expect(await status(() => make({ config: null }).svc.start(user, REQUEST))).toBe(503);
    expect(await status(() => make({ config: { provider: 'anthropic' } }).svc.start(user, REQUEST))).toBe(503);
    expect(await status(() => make({ canCreate: false }).svc.start(user, REQUEST))).toBe(403);
    expect(await status(() => make({ generating: true }).svc.start(user, REQUEST))).toBe(409);
  });

  it('stops at the daily limit and treats 0 as unlimited', async () => {
    limits.plan = 1;
    const { svc, tripsRepo } = make();
    safeFetchLlm.mockReturnValue(new Promise(() => {}));
    expect((await svc.start(user, REQUEST)).remaining).toBe(0);
    tripsRepo.hasGenerating.mockResolvedValue(false);
    expect(await status(() => svc.start(user, REQUEST))).toBe(429);
    limits.plan = 0;
    expect((await make().svc.start(user, REQUEST)).remaining).toBeNull();
  });

  it('retries a failed plan with the saved request, only for its owner', async () => {
    const { svc, tripsRepo } = make();
    safeFetchLlm.mockReturnValue(new Promise(() => {}));
    tripsRepo.findAiState.mockResolvedValue({ user_id: 1, ai_status: 'failed', ai_request: JSON.stringify(REQUEST) });
    expect(await svc.retry(1, 42)).toEqual({ tripId: 42, remaining: 4 });
    expect(tripsRepo.setAiState).toHaveBeenCalledWith(42, 'generating');
    expect(await status(() => svc.retry(2, 42))).toBe(404);
    tripsRepo.findAiState.mockResolvedValue({ user_id: 1, ai_status: null, ai_request: null });
    expect(await status(() => svc.retry(1, 42))).toBe(409);
    tripsRepo.findAiState.mockResolvedValue(undefined);
    expect(await status(() => svc.retry(1, 42))).toBe(404);
  });

  it('refuses a retry while another plan is being built and keeps the singular wording for one traveller', async () => {
    const { svc, tripsRepo, trips } = make({ generating: true });
    tripsRepo.findAiState.mockResolvedValue({ user_id: 1, ai_status: 'failed', ai_request: JSON.stringify(REQUEST) });
    expect(await status(() => svc.retry(1, 42))).toBe(409);

    const solo = make();
    safeFetchLlm.mockReturnValue(new Promise(() => {}));
    await solo.svc.start(user, { ...REQUEST, travelers: 1, origin: 'Curitiba' });
    const created = solo.trips.create.mock.calls[0][1] as { description?: string };
    expect(created.description).toContain('1 viajante');
    expect(created.description).toContain('saindo de Curitiba');
    expect(trips.create).not.toHaveBeenCalled();
  });

  it('marks work interrupted by a restart as failed', async () => {
    const { svc, tripsRepo } = make();
    await svc.onApplicationBootstrap();
    expect(tripsRepo.failAllGenerating).toHaveBeenCalled();
  });
});
