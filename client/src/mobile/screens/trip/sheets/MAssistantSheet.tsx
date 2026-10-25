import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Sparkles, X } from '../../../../icons'
import MSheet from '../../../components/MSheet'
import type { MTripSheetsProps } from '../MTripShell'
import { useTranslation } from '../../../../i18n'
import { useAssistantChat } from '../../../../hooks/useAssistantChat'
import { INNER_CLS } from './MTripSheetUi'
import MAssistantCard from './MAssistantCard'

const SUGGESTIONS = ['assistant.suggest1', 'assistant.suggest2', 'assistant.suggest3'] as const

/**
 * Chat of the travel assistant, opened by the leading "Pergunte" pill of the map.
 * The assistant looks places up on Google, reads their ratings and reviews, and
 * recommends them as cards; adding one to the itinerary is the traveller's tap.
 */
export default function MAssistantSheet({ planner, shell }: MTripSheetsProps) {
  const { t } = useTranslation()
  const open = shell.sheet?.id === 'assistant'
  const { turns, loading, send } = useAssistantChat(planner.tripId, planner.language, t('assistant.error'))
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const canAdd = planner.can('place_edit', planner.trip)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turns.length, loading])

  const submit = (text: string) => {
    if (!text.trim() || loading) return
    setDraft('')
    void send(text)
  }
  const dayNumber = (dayId: number | null) =>
    dayId == null ? null : planner.days.find(d => d.id === dayId)?.day_number ?? null

  return (
    <MSheet open={open} onClose={shell.closeSheet} variant="bottom" material="glass" ariaLabel={t('poi.ask')}>
      <div className="flex max-h-[78vh] min-h-0 flex-col gap-3 px-[18px] pb-[18px] pt-4">
        <div className="flex flex-none items-center gap-2">
          <Sparkles size={18} strokeWidth={2} className="flex-none" />
          <span className="min-w-0 flex-1 text-[1rem] font-bold">{t('poi.ask')}</span>
          <button
            type="button"
            onClick={shell.closeSheet}
            aria-label={t('common.close')}
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[color:var(--m-ic)]"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-live="polite">
          <div className={`rounded-[14px] px-3 py-[10px] font-geist text-[0.8125rem] leading-[1.5] ${INNER_CLS}`}>
            {t('assistant.welcome')}
          </div>
          {turns.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => submit(t(key))}
                  className={`rounded-full px-3 py-[7px] text-left font-geist text-[0.75rem] ${INNER_CLS}`}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          )}
          {turns.map(turn => (
            <div key={turn.id} className={`flex flex-col gap-2 ${turn.role === 'user' ? 'items-end' : 'items-stretch'}`}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-[14px] px-3 py-[9px] font-geist text-[0.8125rem] leading-[1.5] ${
                  turn.role === 'user' ? 'bg-m-act text-m-actfg' : INNER_CLS
                } ${turn.failed ? 'text-m-muted' : ''}`}
              >
                {turn.text}
              </div>
              {turn.cards.map(card => (
                <MAssistantCard
                  key={`${turn.id}-${card.ref}`}
                  card={card}
                  language={planner.language}
                  dayNumber={dayNumber(card.dayId)}
                  canAdd={canAdd}
                  onAdd={c => planner.addAssistantPlace(c, c.dayId)}
                />
              ))}
            </div>
          ))}
          {loading && (
            <div className={`flex w-fit items-center gap-2 rounded-[14px] px-3 py-[9px] ${INNER_CLS}`} role="status" aria-label={t('poi.ask')}>
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex flex-none items-center gap-2"
          onSubmit={e => { e.preventDefault(); submit(draft) }}
        >
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={2000}
            aria-label={t('poi.ask')}
            placeholder={t('assistant.placeholder')}
            className={`h-[42px] min-w-0 flex-1 rounded-full px-4 text-[0.875rem] ${INNER_CLS}`}
          />
          <button
            type="submit"
            disabled={loading || !draft.trim()}
            aria-label={t('poi.ask')}
            className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-m-act text-m-actfg disabled:opacity-60"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </form>
      </div>
    </MSheet>
  )
}
