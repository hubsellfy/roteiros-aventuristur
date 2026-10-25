import type { AssistantCard } from '@trek/shared';

/** What the model may call. OpenAI-compatible function definitions. */
export const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_trip',
      description: 'Read the traveller\'s trip: title, dates and each day (with its id) and the places already planned on it. Call it before suggesting where to add something.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_places',
      description: 'Search real places (restaurants, attractions, hotels...) on Google. Returns up to 6 candidates, each with a `ref`, rating and address. Pass near_lat/near_lng (the trip area) so results land in the right city.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to look for, e.g. "pizzaria artesanal" or "Beto Carrero World"' },
          near_lat: { type: 'number' },
          near_lng: { type: 'number' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_details',
      description: 'Get the Google details of a place found with search_places: rating, number of reviews, opening hours, summary and the text of visitor reviews. Use it when the traveller asks about quality, opinions or hours.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'The `ref` returned by search_places' } },
        required: ['ref'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommend_place',
      description: 'Show a place to the traveller as a card with an "add to itinerary" button. Always use it for the places you recommend. Pass day_id (from get_trip) when you propose a specific day; the traveller confirms before anything is added.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          day_id: { type: 'integer', description: 'Day to propose, from get_trip. Omit when it is only a suggestion.' },
          reason: { type: 'string', description: 'One short sentence on why this place fits.' },
        },
        required: ['ref'],
        additionalProperties: false,
      },
    },
  },
] as const;

/** A place the model can refer to by `ref` during one conversation turn. */
export interface KnownPlace {
  ref: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  osmId: string | null;
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  summary: string | null;
  topReview: { author: string; rating: number | null; text: string } | null;
  website: string | null;
  mapsUrl: string | null;
}

const MAX_REVIEW_CHARS = 280;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const coord = (v: unknown): number | null => num(typeof v === 'string' && v.trim() ? Number(v) : v);

/** Provider records vary by source; keep only what the assistant and the card use. */
export function toKnownPlace(ref: string, raw: Record<string, unknown>): KnownPlace | null {
  const lat = coord(raw.lat);
  const lng = coord(raw.lng);
  const name = str(raw.name);
  if (!name || lat == null || lng == null) return null;
  return {
    ref,
    name,
    address: str(raw.address),
    lat,
    lng,
    googlePlaceId: str(raw.google_place_id),
    osmId: str(raw.osm_id),
    rating: num(raw.rating),
    ratingCount: num(raw.rating_count),
    openNow: typeof raw.open_now === 'boolean' ? raw.open_now : null,
    summary: str(raw.summary),
    topReview: null,
    website: str(raw.website),
    mapsUrl: str(raw.google_maps_url),
  };
}

/** Merge a details record into a known place, returning what the model may read. */
export function applyDetails(place: KnownPlace, details: Record<string, unknown>): Record<string, unknown> {
  place.rating = num(details.rating) ?? place.rating;
  place.ratingCount = num(details.rating_count) ?? place.ratingCount;
  place.openNow = typeof details.open_now === 'boolean' ? details.open_now : place.openNow;
  place.summary = str(details.summary) ?? place.summary;
  place.website = str(details.website) ?? place.website;
  place.mapsUrl = str(details.google_maps_url) ?? place.mapsUrl;

  const reviews = Array.isArray(details.reviews) ? (details.reviews as Record<string, unknown>[]) : [];
  const cleaned = reviews
    .map(r => ({ author: str(r.author) ?? '', rating: num(r.rating), text: (str(r.text) ?? '').slice(0, MAX_REVIEW_CHARS) }))
    .filter(r => r.text)
    .slice(0, 3);
  const best = [...cleaned].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  if (best) place.topReview = best;

  return {
    name: place.name,
    address: place.address,
    rating: place.rating,
    rating_count: place.ratingCount,
    open_now: place.openNow,
    opening_hours: Array.isArray(details.opening_hours) ? details.opening_hours : null,
    summary: place.summary,
    website: place.website,
    reviews: cleaned,
  };
}

export function toCard(place: KnownPlace, dayId: number | null, reason: string | null): AssistantCard {
  return {
    ref: place.ref,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    googlePlaceId: place.googlePlaceId,
    osmId: place.osmId,
    rating: place.rating,
    ratingCount: place.ratingCount,
    openNow: place.openNow,
    reason,
    summary: place.summary,
    topReview: place.topReview,
    website: place.website,
    mapsUrl: place.mapsUrl,
    dayId,
  };
}
