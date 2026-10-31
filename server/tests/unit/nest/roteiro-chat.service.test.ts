import { RoteiroChatService, describeTrip, listsPlacesInText } from '../../../src/nest/roteiro-ia/roteiro-chat.service';
import { RoteiroIaController } from '../../../src/nest/roteiro-ia/roteiro-ia.controller';
import { applyDetails, toCard, toKnownPlace } from '../../../src/nest/roteiro-ia/roteiro-ia.tools';
import { HttpException } from '@nestjs/common';

import { describe, it, expect, vi, beforeEach } from 'vitest';

const safeFetchLlm = vi.fn();
const limits = vi.hoisted(() => ({ daily: 40 }));
vi.mock('../../../src/app-config', async () => {
  const actual = await vi.importActual<typeof import('../../../src/app-config')>('../../../src/app-config');
  return {
    ...actual,
    readEnv: () => ({
      ...actual.readEnv(),
      integrations: { ...actual.readEnv().integrations, assistantDailyLimit: limits.daily },
    }),
  };
});
vi.mock('../../../src/utils/ssrfGuard', () => ({ safeFetchLlm: (...a: unknown[]) => safeFetchLlm(...a) }));

const PLACE = {
  name: 'Cantina Bella',
  address: 'Rua A, 10',
  lat: -25.5,
  lng: -48.5,
  google_place_id: 'g1',
  rating: 4.6,
  rating_count: 120,
};

function json(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}
const answer = (message: Record<string, unknown>) => json({ choices: [{ message }] });
const toolCall = (name: string, args: Record<string, unknown>, id = 'c1') => ({
  id,
  type: 'function',
  function: { name, arguments: JSON.stringify(args) },
});

function make(overrides: { config?: unknown; canAccess?: boolean } = {}) {
  const maps = {
    searchPlaces: vi.fn().mockResolvedValue({ places: [PLACE], source: 'google' }),
    detailsDisabled: vi.fn().mockResolvedValue(false),
    getPlaceDetailsExpanded: vi.fn().mockResolvedValue({
      place: {
        rating: 4.7,
        rating_count: 130,
        open_now: true,
        summary: 'Massas artesanais',
        opening_hours: ['seg: 11-23'],
        google_maps_url: 'https://maps.google.com/?cid=1',
        reviews: [
          { author: 'Ana', rating: 5, text: 'x'.repeat(400) },
          { author: 'Beto', rating: 3, text: 'ok' },
        ],
      },
    }),
  };
  const days = {
    list: vi.fn().mockResolvedValue({
      days: [{ id: 7, day_number: 1, date: '2026-12-01', assignments: [{ place: { name: 'Hotel', lat: 1, lng: 2 } }] }],
    }),
  };
  const trips = {
    canAccessTrip: vi.fn().mockResolvedValue(overrides.canAccess === false ? null : { user_id: 1 }),
    getRaw: vi.fn().mockResolvedValue({ title: 'Paraná', start_date: '2026-12-01', end_date: '2026-12-05' }),
  };
  const config =
    overrides.config === undefined
      ? { provider: 'openai', model: 'm', baseUrl: 'https://openrouter.ai/api/v1/', apiKey: 'k', multimodal: false }
      : overrides.config;
  const llm = { resolve: vi.fn().mockResolvedValue(config) };
  const aiClients = { createForLlmConfig: vi.fn() };
  const svc = new RoteiroChatService(maps as never, days as never, trips as never, llm as never, aiClients as never);
  return { svc, maps, days, trips, llm, aiClients };
}

const body = { tripId: 1, language: 'pt-BR', messages: [{ role: 'user' as const, content: 'onde almoçar?' }] };

async function status(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    return (e as HttpException).getStatus();
  }
  return 0;
}

describe('RoteiroChatService', () => {
  beforeEach(() => {
    safeFetchLlm.mockReset();
    limits.daily = 40;
  });

  it('returns the model text when no tool is needed', async () => {
    const { svc } = make();
    safeFetchLlm.mockResolvedValueOnce(answer({ content: 'Olá!' }));
    const res = await svc.chat(1, body);
    expect(res.reply).toBe('Olá!');
    expect(res.cards).toEqual([]);
    expect(res.remaining).toBe(39);
    const [url, init] = safeFetchLlm.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer k' });
  });

  it('runs search, details and recommend, producing a card for a valid day', async () => {
    const { svc, maps } = make();
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('get_trip', {}, 'a'),
            toolCall('search_places', { query: 'massa', near_lat: 1, near_lng: 2 }, 'b'),
          ],
        }),
      )
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('place_details', { ref: 'p1' }, 'c'),
            toolCall('recommend_place', { ref: 'p1', day_id: 7, reason: 'Boa nota' }, 'd'),
          ],
        }),
      )
      .mockResolvedValueOnce(answer({ content: 'Sugiro a Cantina Bella no dia 1.' }));
    const res = await svc.chat(1, body);
    expect(maps.searchPlaces).toHaveBeenCalledWith(
      1,
      'massa',
      'pt-BR',
      { lat: 1, lng: 2, radius: 20000 },
      { googleOnly: true },
    );
    expect(res.cards).toHaveLength(1);
    expect(res.cards[0]).toMatchObject({
      ref: 'p1',
      name: 'Cantina Bella',
      dayId: 7,
      rating: 4.7,
      openNow: true,
      reason: 'Boa nota',
    });
    expect(res.cards[0].topReview?.author).toBe('Ana');
    expect(res.cards[0].topReview?.text.length).toBe(280);
    // The tool result handed back to the model carries the trimmed review, not the 400 chars.
    const third = JSON.parse((safeFetchLlm.mock.calls[2][1] as { body: string }).body).messages;
    const toolMsgs = third.filter((m: { role: string }) => m.role === 'tool');
    expect(toolMsgs).toHaveLength(4);
  });

  it('drops a day id that is not in the trip', async () => {
    const { svc } = make();
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'x' }, 'a')] }))
      .mockResolvedValueOnce(
        answer({ content: null, tool_calls: [toolCall('recommend_place', { ref: 'p1', day_id: 999 }, 'b')] }),
      )
      .mockResolvedValueOnce(answer({ content: 'ok' }));
    const res = await svc.chat(1, body);
    expect(res.cards[0].dayId).toBeNull();
  });

  it('answers tool errors to the model instead of failing the turn', async () => {
    const { svc, maps } = make();
    maps.searchPlaces.mockRejectedValueOnce(new Error('boom'));
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            toolCall('search_places', { query: 'x' }, 'a'),
            toolCall('place_details', { ref: 'zz' }, 'b'),
            toolCall('nope', {}, 'c'),
          ],
        }),
      )
      .mockResolvedValueOnce(answer({ content: 'Não achei.' }));
    const res = await svc.chat(1, body);
    expect(res.reply).toBe('Não achei.');
  });

  it('handles bad JSON arguments, empty queries and disabled details', async () => {
    const { svc, maps } = make();
    maps.detailsDisabled.mockReturnValue(true);
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [
            { id: 'a', type: 'function', function: { name: 'search_places', arguments: '{bad' } },
            toolCall('search_places', { query: '   ' }, 'b'),
            toolCall('search_places', { query: 'massa' }, 'c'),
            toolCall('place_details', { ref: 'p1' }, 'd'),
          ],
        }),
      )
      .mockResolvedValueOnce(answer({ content: 'feito' }));
    expect((await svc.chat(1, body)).reply).toBe('feito');
  });

  it('gives a friendly fallback when the model never stops calling tools', async () => {
    const { svc } = make();
    safeFetchLlm.mockResolvedValue(answer({ content: null, tool_calls: [toolCall('get_trip', {})] }));
    const res = await svc.chat(1, body);
    expect(res.reply).toContain('Não consegui');
  });

  it('answers in English when the language is not Portuguese and the model returns nothing', async () => {
    const { svc } = make();
    safeFetchLlm.mockResolvedValueOnce(answer({ content: '  ' }));
    const res = await svc.chat(1, { ...body, language: 'en' });
    expect(res.reply).toContain('could not finish');
  });

  it('treats the app language code br as Brazilian Portuguese', async () => {
    const { svc } = make();
    safeFetchLlm.mockResolvedValueOnce(answer({ content: ' ' }));
    const res = await svc.chat(1, { ...body, language: 'br' });
    expect(res.reply).toContain('Não consegui');
    const payload = JSON.parse((safeFetchLlm.mock.calls[0][1] as { body: string }).body);
    expect(payload.messages[0].content).toContain('português do Brasil');
  });

  it('404s for a trip the user cannot open and 503s when no AI is configured', async () => {
    expect(await status(() => make({ canAccess: false }).svc.chat(1, body))).toBe(404);
    expect(await status(() => make({ config: null }).svc.chat(1, body))).toBe(503);
  });

  it('routes Anthropic through the provider adapter', async () => {
    const config = { provider: 'anthropic', model: 'claude', apiKey: 'test' };
    const { svc, aiClients } = make({ config });
    aiClients.createForLlmConfig.mockReturnValue({
      stream: async function* () {
        yield { type: 'text-delta', delta: 'Olá!' };
        yield { type: 'finish', reason: 'stop' };
      },
    });
    const result = await svc.chat(1, body);
    expect(result.reply).toBe('Olá!');
    expect(aiClients.createForLlmConfig).toHaveBeenCalledWith(config);
  });

  it('routes first-party reasoning models through Responses and keeps provider replay state', async () => {
    const config = { provider: 'openai', model: 'gpt-5.2', apiKey: 'test' };
    const { svc, aiClients } = make({ config });
    const state = { adapter: 'openai-responses', items: [{ type: 'reasoning' }] };
    let nativeRequest: unknown;
    aiClients.createForLlmConfig.mockReturnValue({
      stream: async function* (request: unknown) {
        nativeRequest = request;
        yield { type: 'tool-call', call: { id: 'call-1', name: 'search_places', args: { query: 'praia' } } };
        yield { type: 'provider-state', state };
        yield { type: 'finish', reason: 'tool-calls' };
      },
    });
    const result = await svc.complete(
      config as never,
      [
        { role: 'system', content: 'prompt' },
        { role: 'user', content: 'buscar' },
      ],
      {
        tools: [
          {
            type: 'function',
            function: { name: 'search_places', description: 'Search', parameters: { type: 'object' } },
          },
        ],
        toolChoice: { type: 'function', function: { name: 'search_places' } },
      },
    );
    expect(result.tool_calls?.[0]).toMatchObject({
      id: 'call-1',
      function: { name: 'search_places', arguments: '{"query":"praia"}' },
    });
    expect(result.providerState).toEqual(state);
    expect(nativeRequest).toMatchObject({ toolChoice: 'required' });
  });

  it('maps provider failures to 502', async () => {
    const { svc } = make();
    safeFetchLlm.mockRejectedValueOnce(new Error('net'));
    expect(await status(() => svc.chat(1, body))).toBe(502);
    safeFetchLlm.mockResolvedValueOnce(json({ error: 'no' }, false, 401));
    expect(await status(() => svc.chat(1, body))).toBe(502);
    safeFetchLlm.mockResolvedValueOnce(json({ choices: [] }));
    expect(await status(() => svc.chat(1, body))).toBe(502);
  });

  it('enforces the daily limit, which 0 turns off', async () => {
    limits.daily = 2;
    const { svc } = make();
    safeFetchLlm.mockResolvedValue(answer({ content: 'ok' }));
    expect((await svc.chat(1, body)).remaining).toBe(1);
    expect((await svc.chat(1, body)).remaining).toBe(0);
    expect(await status(() => svc.chat(1, body))).toBe(429);
    limits.daily = 0;
    expect((await svc.chat(1, body)).remaining).toBeNull();
  });

  it('uses the local default endpoint without a key', async () => {
    const { svc } = make({ config: { provider: 'local', model: 'm', multimodal: false } });
    safeFetchLlm.mockResolvedValueOnce(answer({ content: 'ok' }));
    await svc.chat(1, body);
    const [url, init] = safeFetchLlm.mock.calls[0];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBeUndefined();
  });

  it('reuses the same ref for a repeated Google place', async () => {
    const { svc, maps } = make();
    maps.searchPlaces.mockResolvedValue({ places: [PLACE, PLACE], source: 'google' });
    safeFetchLlm
      .mockResolvedValueOnce(
        answer({
          content: null,
          tool_calls: [toolCall('search_places', { query: 'a' }, 'a'), toolCall('search_places', { query: 'a' }, 'b')],
        }),
      )
      .mockResolvedValueOnce(answer({ content: 'ok' }));
    await svc.chat(1, body);
    const sent = JSON.parse((safeFetchLlm.mock.calls[1][1] as { body: string }).body).messages;
    const results = sent
      .filter((m: { role: string }) => m.role === 'tool')
      .map((m: { content: string }) => JSON.parse(m.content).results);
    expect(results[0]).toHaveLength(1);
    expect(results[1][0].ref).toBe('p1');
  });
});

describe('assistant tools helpers', () => {
  it('answers place details for unknown refs, places without Google data and empty Google answers', async () => {
    const { svc, maps } = make();
    const state = { userId: 1, tripId: 1, language: 'pt-BR', known: new Map(), cards: new Map(), nextRef: 1 };
    const details = (args: Record<string, unknown>) =>
      (svc as unknown as { placeDetails: (s: unknown, a: unknown) => Promise<Record<string, unknown>> }).placeDetails(
        state,
        args,
      );
    expect(await details({ ref: 5 })).toEqual({ error: 'unknown ref; call search_places first' });
    state.known.set('p1', {
      ref: 'p1',
      name: 'Praça',
      address: 'Centro',
      lat: 1,
      lng: 2,
      googlePlaceId: null,
    } as never);
    expect(await details({ ref: 'p1' })).toMatchObject({ note: 'No Google details for this place.' });
    state.known.set('p2', { ref: 'p2', name: 'Cantina', address: 'Rua', lat: 1, lng: 2, googlePlaceId: 'g2' } as never);
    maps.getPlaceDetailsExpanded.mockResolvedValueOnce({ place: null });
    expect(await details({ ref: 'p2' })).toMatchObject({ note: 'Google returned no details for this place.' });
  });

  it('recommends a place without a day or reason, and ignores an unknown ref', async () => {
    const { svc } = make();
    const state = { userId: 1, tripId: 1, language: 'pt-BR', known: new Map(), cards: new Map(), nextRef: 1 };
    const recommend = (args: Record<string, unknown>) =>
      (svc as unknown as { recommend: (s: unknown, a: unknown) => Promise<Record<string, unknown>> }).recommend(
        state,
        args,
      );
    expect(await recommend({})).toEqual({ error: 'unknown ref; call search_places first' });
    state.known.set('p1', {
      ref: 'p1',
      name: 'Praça',
      address: 'Centro',
      lat: 1,
      lng: 2,
      googlePlaceId: null,
    } as never);
    expect(await recommend({ ref: 'p1', reason: '   ' })).toMatchObject({ shown: true, day_id: null });
    expect(state.cards.has('p1')).toBe(true);
  });

  it('rejects records without a name or coordinates and parses string coordinates', () => {
    expect(toKnownPlace('p1', { name: 'A' })).toBeNull();
    expect(toKnownPlace('p1', { lat: 1, lng: 2 })).toBeNull();
    expect(toKnownPlace('p1', { name: 'A', lat: '1.5', lng: '2.5' })).toMatchObject({ lat: 1.5, lng: 2.5 });
  });

  it('applyDetails keeps previous values when details are sparse', () => {
    const place = toKnownPlace('p1', { ...PLACE, website: 'https://w' });
    if (!place) throw new Error('place expected');
    const out = applyDetails(place, {});
    expect(out).toMatchObject({ rating: 4.6, rating_count: 120, website: 'https://w', reviews: [] });
    expect(toCard(place, null, null)).toMatchObject({ dayId: null, topReview: null });
  });
});

describe('RoteiroIaController', () => {
  it('passes the user id and body to the service', async () => {
    const chat = vi.fn().mockResolvedValue({ reply: 'x', cards: [], remaining: null });
    const c = new RoteiroIaController({ chat } as never, {} as never);
    await c.chat({ id: 5 } as never, body as never);
    expect(chat).toHaveBeenCalledWith(5, body);
  });

  it('starts and retries itinerary plans for the signed-in user', async () => {
    const start = vi.fn().mockResolvedValue({ tripId: 9, remaining: 4 });
    const retry = vi.fn().mockResolvedValue({ tripId: 9, remaining: 3 });
    const c = new RoteiroIaController({} as never, { start, retry } as never);
    const user = { id: 5, role: 'user' };
    expect(await c.createTripPlan(user as never, { destination: 'Gramado' } as never)).toEqual({
      tripId: 9,
      remaining: 4,
    });
    expect(start).toHaveBeenCalledWith(user, { destination: 'Gramado' });
    expect(await c.retryTripPlan(user as never, 9)).toEqual({ tripId: 9, remaining: 3 });
    expect(retry).toHaveBeenCalledWith(5, 9);
  });
});

describe('conversational chat', () => {
  beforeEach(() => safeFetchLlm.mockReset());

  it('puts the trip, the open day and the stops in the system prompt', async () => {
    const { svc } = make();
    safeFetchLlm.mockResolvedValueOnce(answer({ content: 'Oi!' }));
    await svc.chat(1, { ...body, context: { dayId: 7 } });
    const sent = JSON.parse((safeFetchLlm.mock.calls[0][1] as RequestInit).body as string);
    const system = sent.messages[0].content as string;
    expect(system).toContain('Paraná');
    expect(system).toContain('day_id 7 [OPEN NOW]: Hotel');
    expect(system).toContain('MUST call search_places');
  });

  it('measures "nearby" from the last stop of the open day when the model gives no coordinates', async () => {
    const { svc, maps } = make();
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'almoço' })] }))
      .mockResolvedValueOnce(answer({ content: 'Achei uns lugares.' }));
    await svc.chat(1, { ...body, context: { dayId: 7 } });
    expect(maps.searchPlaces).toHaveBeenCalledWith(
      1,
      'almoço',
      'pt-BR',
      { lat: 1, lng: 2, radius: 5000 },
      { googleOnly: true },
    );
  });

  it('sends the model back to the tools once when it lists venues in the text', async () => {
    const { svc, maps } = make();
    safeFetchLlm
      .mockResolvedValueOnce(answer({ content: '1. **Bella Brasa** - Rua A\n2. **Di Pietro** - Rua B' }))
      .mockResolvedValueOnce(answer({ content: null, tool_calls: [toolCall('search_places', { query: 'almoço' })] }))
      .mockResolvedValueOnce(answer({ content: 'Veja as opções abaixo.' }));
    const res = await svc.chat(1, body);
    expect(maps.searchPlaces).toHaveBeenCalledTimes(1);
    expect(res.reply).toBe('Veja as opções abaixo.');
    const second = JSON.parse((safeFetchLlm.mock.calls[1][1] as RequestInit).body as string);
    expect(second.messages.at(-1).content).toContain('Do not list places in text');
  });

  it('accepts a list in the text after one nudge instead of looping', async () => {
    const { svc } = make();
    const list = '- Bella Brasa\n- Di Pietro';
    safeFetchLlm.mockResolvedValueOnce(answer({ content: list })).mockResolvedValueOnce(answer({ content: list }));
    const res = await svc.chat(1, body);
    expect(res.reply).toBe(list);
    expect(safeFetchLlm).toHaveBeenCalledTimes(2);
  });
});

describe('describeTrip and listsPlacesInText', () => {
  const trip = {
    title: null,
    start_date: null,
    end_date: null,
    days: [
      { day_id: 1, day_number: 1, date: null, places: [{ name: 'Museu', time: '09:00', lat: 1, lng: 2 }] },
      { day_id: 2, day_number: 2, date: '2026-12-02', places: [] },
    ],
  };

  it('marks the open day, says when a day is empty and anchors on the last stop', () => {
    const open = describeTrip(trip, 1);
    expect(open.text).toContain('Trip: untitled (? to ?)');
    expect(open.text).toContain('Day 1, day_id 1 [OPEN NOW]: 09:00 Museu');
    expect(open.text).toContain('nothing planned yet');
    expect(open.anchor).toEqual({ lat: 1, lng: 2 });
  });

  it('has no anchor when nothing is planned anywhere', () => {
    expect(describeTrip({ ...trip, days: [trip.days[1]] }, 2).anchor).toBeNull();
  });

  it('spots a bulleted or numbered list but not a plain sentence', () => {
    expect(listsPlacesInText('1) A\n2) B')).toBe(true);
    expect(listsPlacesInText('Vá ao Museu e depois almoce perto.')).toBe(false);
    expect(listsPlacesInText('- só um item')).toBe(false);
  });
});
