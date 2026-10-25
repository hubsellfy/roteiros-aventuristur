import { Send, Sparkles, X } from '../../../../icons'
import MSheet from '../../../components/MSheet'
import type { MTripSheetsProps } from '../MTripShell'
import { useTranslation } from '../../../../i18n'
import { INNER_CLS } from './MTripSheetUi'

/**
 * Chat of the travel assistant, opened by the leading "Pergunte" pill of the map.
 * The assistant itself is not connected yet, so the conversation area says so and
 * the message field stays disabled; the sheet is the place it will live in.
 */
export default function MAssistantSheet({ shell }: MTripSheetsProps) {
  const { t } = useTranslation()
  const open = shell.sheet?.id === 'assistant'

  return (
    <MSheet open={open} onClose={shell.closeSheet} variant="bottom" material="glass" ariaLabel={t('poi.ask')}>
      <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-4">
        <div className="flex items-center gap-2">
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
        <div className={`rounded-[14px] px-3 py-[10px] font-geist text-[0.8125rem] leading-[1.5] text-m-muted ${INNER_CLS}`}>
          {t('poi.askSoon')}
        </div>
        <div className="flex items-center gap-2">
          <input
            disabled
            aria-label={t('poi.ask')}
            placeholder={t('poi.ask')}
            className={`h-[42px] min-w-0 flex-1 rounded-full px-4 text-[0.875rem] opacity-60 ${INNER_CLS}`}
          />
          <button
            type="button"
            disabled
            aria-label={t('poi.ask')}
            className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-m-act text-m-actfg opacity-60"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </MSheet>
  )
}
