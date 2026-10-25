import { useState } from 'react'
import type { RoteiroCard } from '@trek/shared'
import { ExternalLink, Plus, Star } from '../../../../icons'
import { useTranslation } from '../../../../i18n'
import { useGooglePlacePhoto } from '../../../../hooks/useGooglePlacePhoto'
import { safeHttpUrl } from '../../../../utils/safeUrl'
import { INNER_CLS } from './MTripSheetUi'

interface Props {
  card: RoteiroCard
  language: string
  /** Day number to name on the button when the assistant proposed a day. */
  dayNumber: number | null
  canAdd: boolean
  onAdd: (card: RoteiroCard) => Promise<boolean>
}

/**
 * A place the assistant recommends: picture, Google rating, why it fits and a
 * button that adds it to the itinerary. The button is the traveller's
 * confirmation — the assistant itself never writes to the trip.
 */
export default function MAssistantCard({ card, language, dayNumber, canAdd, onAdd }: Props) {
  const { t } = useTranslation()
  const photo = useGooglePlacePhoto(card.googlePlaceId, card.lat, card.lng, card.name, language)
  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle')
  const mapsUrl = safeHttpUrl(card.mapsUrl)

  const add = async () => {
    if (state !== 'idle') return
    setState('adding')
    setState((await onAdd(card)) ? 'added' : 'idle')
  }

  return (
    <div className={`overflow-hidden rounded-[14px] ${INNER_CLS}`}>
      {photo && <img src={photo} alt={card.name} loading="lazy" className="h-[110px] w-full object-cover" />}
      <div className="px-3 py-[10px]">
        <div className="text-[0.875rem] font-bold leading-snug">{card.name}</div>
        {card.rating != null && (
          <div className="mt-[3px] flex items-center gap-1 font-geist text-[0.75rem] text-m-muted">
            <Star size={12} fill="#facc15" color="#facc15" className="flex-none" />
            <span className="font-semibold">{card.rating.toFixed(1)}</span>
            {card.ratingCount != null && <span>({card.ratingCount.toLocaleString(language)})</span>}
          </div>
        )}
        {card.address && <div className="mt-[2px] font-geist text-[0.6875rem] leading-[1.4] text-m-muted">{card.address}</div>}
        {card.reason && <div className="mt-[6px] font-geist text-[0.78125rem] leading-[1.5]">{card.reason}</div>}
        {card.topReview && (
          <blockquote className="mt-[6px] border-l-2 border-[color:var(--m-inbr)] pl-2 font-geist text-[0.71875rem] italic leading-[1.5] text-m-muted">
            “{card.topReview.text}” — {card.topReview.author}
          </blockquote>
        )}
        <div className="mt-[10px] flex items-center gap-2">
          {canAdd && (
            <button
              type="button"
              onClick={add}
              disabled={state !== 'idle'}
              className="flex h-[34px] items-center gap-[6px] rounded-full bg-m-act px-3 text-[0.78125rem] font-semibold text-m-actfg disabled:opacity-60"
            >
              <Plus size={14} strokeWidth={2.2} />
              {state === 'added'
                ? t('assistant.added')
                : dayNumber != null ? t('assistant.addToDay', { day: dayNumber }) : t('assistant.addToTrip')}
            </button>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[34px] items-center gap-[5px] rounded-full px-2 font-geist text-[0.6875rem] text-m-muted"
            >
              <ExternalLink size={12} strokeWidth={2} />
              {t('assistant.source')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
