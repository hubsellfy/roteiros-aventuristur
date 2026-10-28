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
  return { svc, maps, trips, tripsRepo, days, places, assignments, llm };
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
    [{ days: [null] }, 'each day must be an object'],
    [{ days: [{ day_number: 1, items: [null] }] }, 'each place must be an object'],
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

  it('completes a six-day trip when the model submits the days in two valid batches', async () => {
    const { svc, maps, days, assignments, tripsRepo } = make();
    const sixPlaces = Array.from({ length: 6 }, (_, i) => ({
      name: `Place ${i + 1}`,
      address: 'Centro',
      lat: -25.5 - i / 100,
      lng: -48.5,
      google_place_id: `g${i + 1}`,
      rating: 4.5,
      rating_count: 100,
    }));
    maps.searchPlaces.mockResolvedValue({ places: sixPlaces, source: 'google' });
    days.list.mockResolvedValue({
      days: Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, day_number: i + 1, notes: null, title: null })),
    });
    const planDay = (n: number) => ({ day_number: n, items: [{ ref: `p${n}`, time: '10:00' }] });
    safeFetchLlm
      .mockResolvedValue(answer({ content: null, tool_calls: [] }))
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'atrações' })] }))
      .mockResolvedValueOnce(
        answer({ content: null, tool_calls: [toolCall('submit_itinerary', { days: [1, 2, 3].map(planDay) })] }),
      )
      .mockResolvedValueOnce(
        answer({ content: null, tool_calls: [toolCall('submit_itinerary', { days: [4, 5, 6].map(planDay) })] }),
      );

    await svc.start(user, { ...REQUEST, startDate: '2026-12-29', endDate: '2027-01-03' });
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(6));
    expect(tripsRepo.setAiState).toHaveBeenLastCalledWith(42, null);
  });

  it('tells the model which submitted days were kept and which remain', async () => {
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
    const fourth = JSON.parse((safeFetchLlm.mock.calls[3][1] as { body: string }).body).messages as {
      role: string;
      tool_call_id?: string;
      content: string;
    }[];
    const feedback = fourth.find((message) => message.tool_call_id === 's1');
    expect(feedback).toBeDefined();
    if (!feedback) throw new Error('partial submission feedback missing');
    expect(JSON.parse(feedback.content)).toMatchObject({ accepted_days: [1], missing_days: [2], used_refs: ['p1'] });
    expect(JSON.stringify(fourth)).toContain('Call submit_itinerary');
  });

  it('keeps valid days in memory, rejects reused or unknown places and saves only after correction', async () => {
    const { svc, days, places, assignments } = make();
    days.list.mockResolvedValue({
      days: Array.from({ length: 3 }, (_, i) => ({ id: 100 + i, day_number: i + 1, notes: null, title: null })),
    });
    let resolveFinal: (value: ReturnType<typeof answer>) => void = () => {};
    const pendingFinal = new Promise<ReturnType<typeof answer>>((resolve) => {
      resolveFinal = resolve;
    });
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'atrações' })] }))
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall(
              'submit_itinerary',
              {
                days: [
                  { day_number: 1, items: [{ ref: 'p1', time: '09:00' }] },
                  { day_number: 2, items: [{ ref: 'p1', time: '10:00' }] },
                  { day_number: 3, items: [{ ref: 'p99', time: '11:00' }] },
                ],
              },
              'partial',
            ),
          ],
        }),
      )
      .mockReturnValueOnce(pendingFinal);

    await svc.start(user, { ...REQUEST, endDate: '2026-12-03' });
    await vi.waitFor(() => expect(safeFetchLlm).toHaveBeenCalledTimes(3));
    expect(places.create).not.toHaveBeenCalled();
    expect(assignments.createAssignment).not.toHaveBeenCalled();
    const messages = JSON.parse((safeFetchLlm.mock.calls[2][1] as { body: string }).body).messages as {
      tool_call_id?: string;
      content: string;
    }[];
    const feedbackMessage = messages.find((message) => message.tool_call_id === 'partial');
    expect(feedbackMessage).toBeDefined();
    if (!feedbackMessage) throw new Error('partial submission feedback missing');
    const feedback = JSON.parse(feedbackMessage.content);
    expect(feedback).toMatchObject({ accepted_days: [1], missing_days: [2, 3], used_refs: ['p1'] });
    expect(feedback.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ day: 2, error: expect.stringContaining('already used') }),
        expect.objectContaining({ day: 3, error: expect.stringContaining('never returned') }),
      ]),
    );
    resolveFinal(
      answer({
        content: null,
        tool_calls: [
          toolCall('submit_itinerary', {
            days: [
              { day_number: 2, items: [{ ref: 'p2', time: '10:00' }] },
              { day_number: 3, items: [{ ref: 'p3', time: '11:00' }] },
            ],
          }),
        ],
      }),
    );
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(3));
    expect(places.create.mock.calls.map((call) => call[1].name)).toEqual(['Praça', 'Museu', 'Parque']);
  });

  it('does not save any places when a partial itinerary never becomes complete', async () => {
    const { svc, tripsRepo, places, assignments } = make();
    safeFetchLlm.mockResolvedValue(answer({ content: null, tool_calls: [] })).mockResolvedValueOnce(
      answer({
        content: null,
        tool_calls: [
          toolCall('submit_itinerary', {
            days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }],
          }),
        ],
      }),
    );
    await svc.start(user, REQUEST);
    await vi.waitFor(() => expect(tripsRepo.setAiState).toHaveBeenCalledWith(42, 'failed'));
    expect(places.create).not.toHaveBeenCalled();
    expect(assignments.createAssignment).not.toHaveBeenCalled();
  });

  it('retains accepted days after an empty day and malformed JSON, then accepts a correction', async () => {
    const { svc, assignments } = make();
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall(
              'submit_itinerary',
              {
                days: [
                  { day_number: 1, items: [{ ref: 'p1', time: '09:00' }] },
                  { day_number: 2, items: [] },
                ],
              },
              'partial',
            ),
          ],
        }),
      )
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            {
              id: 'malformed',
              type: 'function',
              function: { name: 'submit_itinerary', arguments: '{' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('submit_itinerary', {
              days: [{ day_number: 2, items: [{ ref: 'p2', time: '10:00' }] }],
            }),
          ],
        }),
      );
    await svc.start(user, REQUEST);
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(2));
    const messages = JSON.parse((safeFetchLlm.mock.calls[2][1] as { body: string }).body).messages as {
      tool_call_id?: string;
      content: string;
    }[];
    const first = messages.find((message) => message.tool_call_id === 'partial');
    const malformed = messages.find((message) => message.tool_call_id === 'malformed');
    if (!first || !malformed) throw new Error('submission feedback missing');
    expect(JSON.parse(first.content)).toMatchObject({
      accepted_days: [1],
      missing_days: [2],
      errors: [{ day: 2, error: 'day 2 has no places' }],
    });
    expect(JSON.parse(malformed.content)).toMatchObject({
      accepted_days: [1],
      missing_days: [2],
      errors: [{ error: 'arguments were not valid JSON' }],
    });
  });

  it('allows another place search after a forced submission references an unknown place', async () => {
    const { svc, days, assignments } = make();
    days.list.mockResolvedValue({ days: [{ id: 100, day_number: 1, notes: null, title: null }] });
    for (let i = 0; i < 14; i++) safeFetchLlm.mockResolvedValueOnce(answer({ content: 'planning' }));
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('submit_itinerary', {
              days: [{ day_number: 1, items: [{ ref: 'p99', time: '09:00' }] }],
            }),
          ],
        }),
      )
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'atrações' })] }))
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('submit_itinerary', {
              days: [{ day_number: 1, items: [{ ref: 'p1', time: '09:00' }] }],
            }),
          ],
        }),
      );
    await svc.start(user, { ...REQUEST, endDate: REQUEST.startDate });
    await vi.waitFor(() => expect(assignments.createAssignment).toHaveBeenCalledTimes(1));
    const forced = JSON.parse((safeFetchLlm.mock.calls[14][1] as { body: string }).body);
    const recovery = JSON.parse((safeFetchLlm.mock.calls[15][1] as { body: string }).body);
    expect(forced.tools).toHaveLength(1);
    expect(recovery.tools).toHaveLength(3);
    expect(recovery.tool_choice).toBe('auto');
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
