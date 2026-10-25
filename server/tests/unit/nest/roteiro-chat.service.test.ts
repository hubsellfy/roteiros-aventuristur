import { RoteiroChatService } from '../../../src/nest/roteiro-ia/roteiro-chat.service';
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
  const svc = new RoteiroChatService(maps as never, days as never, trips as never, llm as never);
  return { svc, maps, days, trips, llm };
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

  it('404s for a trip the user cannot open and 503s when no AI is configured', async () => {
    expect(await status(() => make({ canAccess: false }).svc.chat(1, body))).toBe(404);
    expect(await status(() => make({ config: null }).svc.chat(1, body))).toBe(503);
    expect(await status(() => make({ config: { provider: 'anthropic', model: 'm' } }).svc.chat(1, body))).toBe(503);
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
  it('rejects records without a name or coordinates and parses string coordinates', () => {
    expect(toKnownPlace('p1', { name: 'A' })).toBeNull();
    expect(toKnownPlace('p1', { lat: 1, lng: 2 })).toBeNull();
    expect(toKnownPlace('p1', { name: 'A', lat: '1.5', lng: '2.5' })).toMatchObject({ lat: 1.5, lng: 2.5 });
  });

  it('applyDetails keeps previous values when details are sparse', () => {
    const place = toKnownPlace('p1', { ...PLACE, website: 'https://w' })!;
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
