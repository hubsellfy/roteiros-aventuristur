import { RotateCw, AlertTriangle, Sparkles } from '../../icons'
import { useTranslation } from '../../i18n'
import { Tooltip } from '../shared/Tooltip'
import type { ExplorePoiCategory, PoiCategoryGroups } from './usePoiCategories'

interface Props {
  /** The chips to offer, from usePoiCategories by way of usePoiExplore. */
  categories: PoiCategoryGroups
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

// The touch target every segment keeps, however many categories there are.
const SEGMENT = 34

// How far one wheel step moves the bar. Firefox counts a mouse wheel in lines and
// some drivers in pages; a line moves about one segment, a page one bar width.
function wheelPixels(e: React.WheelEvent, barWidth: number): number {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * SEGMENT
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * barWidth
  return e.deltaY
}

// The bar only ever overflows sideways and a plain mouse wheel only turns vertically,
// so on desktop the chips past the corridor edge (the plugin ones first) were out of
// reach without a trackpad. While the bar overflows, a mostly vertical turn scrolls it
// sideways. A sideways swipe or Shift+wheel already scrolls it natively and is left alone.
// In a right-to-left language the chips overflow to the left and scrollLeft runs from 0
// down into negative numbers, so the same turn has to count the other way to reach them.
function wheelSideways(e: React.WheelEvent<HTMLDivElement>) {
  const bar = e.currentTarget
  if (bar.scrollWidth <= bar.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
  const towardEnd = getComputedStyle(bar).direction === 'rtl' ? -1 : 1
  bar.scrollLeft += towardEnd * wheelPixels(e, bar.clientWidth)
}

interface SegmentProps {
  cat: ExplorePoiCategory
  on: boolean
  loading: boolean
  failed: boolean
  fullWidth?: boolean
  /** The frosted look of an inactive phone pill. */
  frosted: React.CSSProperties
  onToggle: (key: string) => void
}

function Segment({ cat, on, loading, failed, fullWidth, frosted, onToggle }: Readonly<SegmentProps>) {
  return (
    <Tooltip label={cat.label} placement="bottom">
      <button
        type="button"
        onClick={() => onToggle(cat.key)}
        aria-pressed={on}
        aria-label={cat.label}
        className={on ? '' : fullWidth ? 'text-content' : 'text-content-muted'}
        style={fullWidth ? {
          ...PILL_BASE,
          ...(on ? { background: cat.color, boxShadow: 'none' } : frosted),
          color: on ? '#fff' : undefined,
        } : {
          position: 'relative',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          minWidth: SEGMENT,
          width: SEGMENT, height: SEGMENT, borderRadius: 999, border: 'none', cursor: 'pointer',
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
        {fullWidth && cat.label}
        {on && !loading && failed && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 8, height: 8,
            borderRadius: 999, background: 'var(--danger)', border: '1.5px solid var(--sidebar-bg)',
          }} />
        )}
      </button>
    </Tooltip>
  )
}

// Frosted, icon-only segmented control that floats over the map. Active segments
// fill with the category colour (matching their markers); the label shows in a
// custom tooltip on hover so the pill stays compact. The core categories come first
// and whatever plugins add follows a thin divider (#1781); once that is more than the
// width holds, the bar scrolls sideways (by swipe, trackpad or mouse wheel) rather than
// shrinking a segment below the touch target.
export default function PoiCategoryPill({ categories, active, onToggle, loadingKeys, errorKeys, moved, onSearchArea, fullWidth, onAsk }: Readonly<Props>) {
  const { t } = useTranslation()
  const anyError = !!errorKeys && Array.from(active).some(k => errorKeys.has(k))

  const frosted: React.CSSProperties = {
    background: 'var(--sidebar-bg)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
  }

  const segment = (cat: ExplorePoiCategory) => {
    const on = active.has(cat.key)
    // Only an active category can be loading: a deselected one whose fetch
    // is still winding down must not keep spinning.
    const loading = on && !!loadingKeys?.has(cat.key)
    return (
      <Segment
        key={cat.key}
        cat={cat}
        on={on}
        loading={loading}
        failed={!!errorKeys?.has(cat.key)}
        fullWidth={fullWidth}
        frosted={frosted}
        onToggle={onToggle}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: fullWidth ? '100%' : undefined, maxWidth: '100%', minWidth: 0 }}>
      <div
        onWheel={fullWidth ? undefined : wheelSideways}
        // The phone shows separate pills, icon plus name, in a row that scrolls sideways,
        // the way Google Maps does. The desktop keeps its compact icon-only segmented bar.
        className={fullWidth ? '[&::-webkit-scrollbar]:hidden' : undefined}
        style={fullWidth ? {
          display: 'flex', alignSelf: 'stretch', alignItems: 'center', gap: 8, padding: '2px 0',
          overflowX: 'auto', pointerEvents: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        } : {
          display: 'inline-flex', alignItems: 'center', gap: 2, padding: 4, borderRadius: 999, pointerEvents: 'auto', ...frosted,
          maxWidth: '100%', overflowX: 'auto', scrollbarWidth: 'none',
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
        {categories.core.map(segment)}
        {categories.plugin.length > 0 && (
          <hr
            aria-orientation="vertical"
            aria-label={t('poi.pluginCategories')}
            style={{ flexShrink: 0, width: 1, height: 20, margin: '0 3px', border: 'none', background: 'var(--border-primary)' }}
          />
        )}
        {categories.plugin.map(segment)}
      </div>

      {(moved || anyError) && active.size > 0 && (
        <button
          type="button"
          onClick={onSearchArea}
          className="text-content"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 13px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontSize: 'calc(12px * var(--fs-scale-caption, 1))', fontWeight: 600, fontFamily: 'inherit', pointerEvents: 'auto',
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
