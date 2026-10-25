import { z } from 'zod';

/**
 * Travel assistant ("Pergunte") API contract — POST /api/assistant/chat.
 *
 * The assistant never writes to a trip. It answers in text and recommends
 * places as cards; a card that carries a day is a proposal the traveller
 * confirms in the app, which then adds the place through the ordinary place
 * routes (so every permission and undo path stays the same).
 */

export const ASSISTANT_MAX_MESSAGES = 20;
export const ASSISTANT_MAX_MESSAGE_CHARS = 2000;

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(ASSISTANT_MAX_MESSAGE_CHARS),
});
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

export const assistantChatRequestSchema = z.object({
  tripId: z.number().int().positive(),
  /** BCP 47 language of the answer and of the place names, e.g. "pt-BR". */
  language: z.string().min(2).max(35).optional(),
  messages: z.array(assistantMessageSchema).min(1).max(ASSISTANT_MAX_MESSAGES),
});
export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;

export const assistantReviewSchema = z.object({
  author: z.string(),
  rating: z.number().nullable(),
  text: z.string(),
});

export const assistantCardSchema = z.object({
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
  topReview: assistantReviewSchema.nullable(),
  website: z.string().nullable(),
  /** Link to the place on Google Maps — shown as the source of the Google data. */
  mapsUrl: z.string().nullable(),
  /** Day the assistant proposes to add it to; null when it only recommends. */
  dayId: z.number().int().nullable(),
});
export type AssistantCard = z.infer<typeof assistantCardSchema>;

export const assistantChatResponseSchema = z.object({
  reply: z.string(),
  cards: z.array(assistantCardSchema),
  /** Messages the traveller may still send today; null when there is no limit. */
  remaining: z.number().int().nullable(),
});
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
