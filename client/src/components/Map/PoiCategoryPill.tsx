import { RotateCw, AlertTriangle, Sparkles } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { Tooltip } from '../shared/Tooltip'
import { POI_CATEGORIES } from './poiCategories'

interface Props {
  active: Set<string>
  onToggle: (key: string) => void
  loadingKeys?: Set<string>
  /** categories whose last fetch failed → show a retry affordance */
  errorKeys?: Set<string>
  /** true when the map moved since the last search → offer "search this area" */
  moved?: boolean
  onSearchArea?: () => void
  /** Stretch the bar across its container and spread the segments evenly.
   *  The phone map gives it the full width between the screen margins; on
   *  desktop it floats, so it stays content-width there. */
  fullWidth?: boolean
  /** Phone layout only: shows the leading "ask" pill, which opens the assistant chat. */
  onAsk?: () => void
}

// Shared look of one phone pill: icon plus label, never shrinking, so the row scrolls.
const PILL_BASE: React.CSSProperties = {
  position: 'relative', flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 38, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
  transition: 'background 0.14s, color 0.14s',
}

// Frosted, icon-only segmented control that floats over the map. Active segments
// fill with the category colour (matching their markers); the label shows in a
// custom tooltip on hover so the pill stays compact and never needs to scroll.
export default function PoiCategoryPill({ active, onToggle, loadingKeys, errorKeys, moved, onSearchArea, fullWidth, onAsk }: Props) {
  const { t } = useTranslation()
  const anyError = !!errorKeys && Array.from(active).some(k => errorKeys.has(k))

  const frosted: React.CSSProperties = {
    background: 'var(--sidebar-bg)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: fullWidth ? '100%' : undefined }}>
      <div
        // The phone shows separate pills, icon plus name, in a row that scrolls sideways,
        // the way Google Maps does. The desktop keeps its compact icon-only segmented bar.
        className={fullWidth ? '[&::-webkit-scrollbar]:hidden' : undefined}
        style={fullWidth ? {
          display: 'flex', alignSelf: 'stretch', alignItems: 'center', gap: 8, padding: '2px 0',
          overflowX: 'auto', pointerEvents: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        } : {
          display: 'inline-flex',
          alignItems: 'center', gap: 2, padding: 4, borderRadius: 999, pointerEvents: 'auto', ...frosted,
        }}
      >
        {fullWidth && onAsk && (
          <button
            type="button"
            onClick={onAsk}
            className="text-content"
            style={{ ...PILL_BASE, ...frosted }}
          >
            <Sparkles size={16} strokeWidth={2} color="#4f9bf0" />
            {t('poi.ask')}
          </button>
        )}
        {POI_CATEGORIES.map(cat => {
          const on = active.has(cat.key)
          // Only an active category can be loading — a deselected one whose fetch
          // is still winding down must not keep spinning.
          const loading = on && !!loadingKeys?.has(cat.key)
          return (
            <Tooltip key={cat.key} label={t(cat.labelKey)} placement="bottom">
              <button
                type="button"
                onClick={() => onToggle(cat.key)}
                aria-pressed={on}
                aria-label={t(cat.labelKey)}
                className={on ? '' : fullWidth ? 'text-content' : 'text-content-muted'}
                style={fullWidth ? {
                  ...PILL_BASE,
                  ...(on ? { background: cat.color, boxShadow: 'none' } : frosted),
                  color: on ? '#fff' : undefined,
                } : {
                  position: 'relative',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: on ? cat.color : 'transparent',
                  color: on ? '#fff' : undefined,
                  transition: 'background 0.14s, color 0.14s',
                }}
                onMouseEnter={e => { if (!on && !fullWidth) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!on && !fullWidth) e.currentTarget.style.background = 'transparent' }}
              >
                {loading ? (
                  <span
                    className="animate-spin"
                    style={{
                      width: 14, height: 14, borderRadius: 999, display: 'inline-block',
                      border: '2px solid', borderColor: on ? 'rgba(255,255,255,0.45)' : 'var(--border-primary)',
                      borderTopColor: on ? '#fff' : 'var(--text-muted)',
                    }}
                  />
                ) : (
                  <cat.Icon size={16} strokeWidth={2} />
                )}
                {fullWidth && t(cat.labelKey)}
                {on && !loading && errorKeys?.has(cat.key) && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2, width: 8, height: 8,
                    borderRadius: 999, background: '#ef4444', border: '1.5px solid var(--sidebar-bg)',
                  }} />
                )}
              </button>
            </Tooltip>
          )
        })}
      </div>

      {(moved || anyError) && active.size > 0 && (
        <button
          type="button"
          onClick={onSearchArea}
          className="text-content"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 13px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit', pointerEvents: 'auto',
            color: anyError ? '#ef4444' : undefined,
            ...frosted,
          }}
        >
          {anyError
            ? <AlertTriangle size={13} strokeWidth={2.4} />
            : <RotateCw size={13} strokeWidth={2.4} />}
          {t('poi.searchThisArea')}
        </button>
      )}
    </div>
  )
}
