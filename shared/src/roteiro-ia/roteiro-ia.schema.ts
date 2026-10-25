import { z } from 'zod';

/**
 * Travel assistant ("Pergunte") API contract — POST /api/assistant/chat.
 *
 * The assistant never writes to a trip. It answers in text and recommends
 * places as cards; a card that carries a day is a proposal the traveller
 * confirms in the app, which then adds the place through the ordinary place
 * routes (so every permission and undo path stays the same).
 */

export const ROTEIRO_MAX_MESSAGES = 20;
export const ROTEIRO_MAX_MESSAGE_CHARS = 2000;

export const roteiroMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(ROTEIRO_MAX_MESSAGE_CHARS),
});
export type RoteiroMessage = z.infer<typeof roteiroMessageSchema>;

export const roteiroChatRequestSchema = z.object({
  tripId: z.number().int().positive(),
  /** BCP 47 language of the answer and of the place names, e.g. "pt-BR". */
  language: z.string().min(2).max(35).optional(),
  messages: z.array(roteiroMessageSchema).min(1).max(ROTEIRO_MAX_MESSAGES),
  /** What the traveller is looking at, so "perto daqui" has a meaning. */
  context: z
    .object({
      /** The day open in the planner. */
      dayId: z.number().int().positive().optional(),
    })
    .optional(),
});
export type RoteiroChatRequest = z.infer<typeof roteiroChatRequestSchema>;

export const roteiroReviewSchema = z.object({
  author: z.string(),
  rating: z.number().nullable(),
  text: z.string(),
});

export const roteiroCardSchema = z.object({
  /** Stable id inside one answer, so the client can key and de-duplicate cards. */
  ref: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  googlePlaceId: z.string().nullable(),
  osmId: z.string().nullable(),
  rating: z.number().nullable(),
  ratingCount: z.number().nullable(),
  openNow: z.boolean().nullable(),
  /** Why it was recommended, in the assistant's words. */
  reason: z.string().nullable(),
  summary: z.string().nullable(),
  topReview: roteiroReviewSchema.nullable(),
  website: z.string().nullable(),
  /** Link to the place on Google Maps — shown as the source of the Google data. */
  mapsUrl: z.string().nullable(),
  /** Day the assistant proposes to add it to; null when it only recommends. */
  dayId: z.number().int().nullable(),
});
export type RoteiroCard = z.infer<typeof roteiroCardSchema>;

export const roteiroChatResponseSchema = z.object({
  reply: z.string(),
  cards: z.array(roteiroCardSchema),
  /** Messages the traveller may still send today; null when there is no limit. */
  remaining: z.number().int().nullable(),
});
export type RoteiroChatResponse = z.infer<typeof roteiroChatResponseSchema>;

/**
 * AI itinerary builder — POST /api/assistant/trip-plan.
 *
 * The request creates the trip at once (so its card shows up in the list) and
 * the itinerary is filled in the background; `ai_status` on the trip says
 * where it stands. The AI only proposes places: the server writes the trip,
 * the places and the days through the ordinary services.
 */

export const TRIP_PLAN_MAX_DAYS = 14;
export const TRIP_PLAN_STYLES = ['equilibrado', 'economico', 'aventura', 'luxo', 'familia', 'romantica'] as const;
export type TripPlanStyle = (typeof TRIP_PLAN_STYLES)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const roteiroTripPlanRequestSchema = z.object({
  destination: z.string().trim().min(2).max(120),
  /** Where the traveller leaves from; only mentioned in the arrival day. */
  origin: z.string().trim().max(120).nullable().optional(),
  startDate: isoDate,
  endDate: isoDate,
  /** Budget in reais. Guidance for the price level of the places, never a quote. */
  budget: z.number().min(0).max(10_000_000).nullable().optional(),
  budgetMode: z.enum(['person', 'total']).optional(),
  travelers: z.number().int().min(1).max(12),
  style: z.enum(TRIP_PLAN_STYLES),
  /** BCP 47 language of the itinerary, e.g. "pt-BR". */
  language: z.string().min(2).max(35).optional(),
});
export type RoteiroTripPlanRequest = z.infer<typeof roteiroTripPlanRequestSchema>;

export const roteiroTripPlanResponseSchema = z.object({
  tripId: z.number().int().positive(),
  /** Itineraries the traveller may still create today; null when there is no limit. */
  remaining: z.number().int().nullable(),
});
export type RoteiroTripPlanResponse = z.infer<typeof roteiroTripPlanResponseSchema>;
