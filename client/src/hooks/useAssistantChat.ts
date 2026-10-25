import type { RoteiroCard, RoteiroMessage } from '@trek/shared';
import { useCallback, useRef, useState } from 'react';
import { roteiroApi } from '../api/client';
import { getApiErrorMessage } from '../utils/apiError';

export interface AssistantTurn {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  cards: RoteiroCard[];
  /** True for an error line shown in the assistant's voice, which is not sent back as history. */
  failed?: boolean;
}

/** What the server accepts as history: the last turns, without the error lines. */
const HISTORY_TURNS = 12;

/**
 * State of one conversation with the travel assistant. The conversation lives only
 * as long as the sheet's owner keeps this hook mounted; nothing is stored.
 */
export function useAssistantChat(tripId: number | null | undefined, language: string, fallbackError: string) {
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const turnsRef = useRef<AssistantTurn[]>([]);
  turnsRef.current = turns;

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !tripId || loading) return;
      const userTurn: AssistantTurn = { id: nextId.current++, role: 'user', text, cards: [] };
      const history: RoteiroMessage[] = [...turnsRef.current, userTurn]
        .filter((turn) => !turn.failed)
        .slice(-HISTORY_TURNS)
        .map((turn) => ({ role: turn.role, content: turn.text }));
      setTurns((prev) => [...prev, userTurn]);
      setLoading(true);
      try {
        const res = await roteiroApi.chat({ tripId, language, messages: history });
        setTurns((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: res.reply, cards: res.cards }]);
      } catch (err: unknown) {
        // The server words its limit message for the traveller; any other failure gets the generic line.
        const status = (err as { response?: { status?: number } })?.response?.status;
        const line = status === 429 ? getApiErrorMessage(err, fallbackError) : fallbackError;
        setTurns((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: line, cards: [], failed: true }]);
      } finally {
        setLoading(false);
      }
    },
    [tripId, language, loading, fallbackError]
  );

  return { turns, loading, send };
}
