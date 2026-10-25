import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Navigation, Phone, Plus, Star, X } from '../../../../icons'
import MSheet from '../../../components/MSheet'
import type { MTripSheetsProps } from '../MTripShell'
import { useTranslation, getIntlLanguage } from '../../../../i18n'
import { mapsApi } from '../../../../api/client'
import { usePlaceDetails } from '../../../../hooks/usePlaceDetails'
import { POI_CATEGORY_BY_KEY, type Poi } from '../../../../components/Map/poiCategories'
import { getNavigationTargets, openNavigationTarget } from '../../../../components/Planner/placeNavigation'
import { NavigationMenu } from '../../../../components/shared/NavigationMenu'
import { safeHttpUrl } from '../../../../utils/safeUrl'
import { ActionCircle, Eyebrow, INNER_CLS } from './MTripSheetUi'

interface GoogleMatch {
  googleId: string
  photoUrl: string | null
}

// One lookup per establishment and language for the whole session: the search
// and the photo are billed by Google, so reopening the same card must be free.
const matchCache = new Map<string, Promise<GoogleMatch | null>>()

function findGoogleMatch(poi: Poi, language: string): Promise<GoogleMatch | null> {
  const key = `${poi.osm_id}_${language}`
  const cached = matchCache.get(key)
  if (cached) return cached
  const lookup = (async (): Promise<GoogleMatch | null> => {
    const query = [poi.name, poi.address].filter(Boolean).join(' ')
    const found = await mapsApi.search(query, language, { lat: poi.lat, lng: poi.lng, radius: 500 }, 'google')
    const hit = found.places.find(p => p.google_place_id)
    if (!hit?.google_place_id) return null
    const photo = await mapsApi.placePhoto(hit.google_place_id, poi.lat, poi.lng, poi.name).catch(() => null)
    return { googleId: hit.google_place_id, photoUrl: photo?.photoUrl ?? null }
  })()
  // A failed lookup (no Google key, quota, offline) is not remembered, so the
  // next open tries again instead of showing an empty card for the session.
  lookup.catch(() => matchCache.delete(key))
  matchCache.set(key, lookup)
  return lookup
}

/**
 * Card of a map "explore" hit (Cafés, Restaurantes...), opened by tapping its
 * pin. Shows what the traveller wants before committing the place to the trip:
 * name, photo, rating, opening hours, a route and the add button. The rating,
 * photo and hours come from Google when it holds the keyed slot; without a key
 * the card still carries the name, address, phone and site the pin already knew.
 */
export default function MPoiSheet({ planner, shell }: MTripSheetsProps) {
  const { t } = useTranslation()
  const poi = shell.sheet?.id === 'poi' ? (shell.sheet.payload as Poi) : null
  const language = planner.language
  const [match, setMatch] = useState<GoogleMatch | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const navBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMatch(null)
    setNavOpen(false)
    if (!poi) return
    let alive = true
    findGoogleMatch(poi, language).then(m => { if (alive) setMatch(m) }).catch(() => {})
    return () => { alive = false }
    // The pin itself is the identity: a new tap on another pin changes osm_id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poi?.osm_id, language])

  const details = usePlaceDetails(match?.googleId, null, language)
  // weekdayDescriptions[0] is Monday; Date#getDay() starts on Sunday.
  const todayIndex = (new Date().getDay() + 6) % 7

  const category = poi ? POI_CATEGORY_BY_KEY[poi.category] : undefined
  const navTargets = getNavigationTargets(poi ? { name: poi.name, lat: poi.lat, lng: poi.lng } : null, details?.google_maps_url)
  const website = safeHttpUrl(poi?.website) ?? safeHttpUrl(details?.website)
  const phone = poi?.phone || details?.phone
  const canAdd = planner.can('place_edit', planner.trip)

  const close = shell.closeSheet
  const directions = () => {
    if (navTargets.length === 1) openNavigationTarget(navTargets[0])
    else if (navTargets.length > 1) setNavOpen(true)
  }
  const addToTrip = () => {
    if (!poi) return
    close()
    planner.openAddPlaceFromPoi(poi, planner.selectedDayId)
  }

  return (
    <MSheet open={!!poi} onClose={close} variant="card" material="glass" ariaLabel={poi?.name}>
      {poi && (
        <>
          <div className="flex-none px-[18px] pt-4">
            <div className="flex items-start gap-3">
              {match?.photoUrl && (
                <div
                  className="h-[52px] w-[52px] flex-none rounded-[16px] border-[1.5px] border-[color:var(--m-avbr)] bg-cover bg-center"
                  style={{ backgroundImage: `url('${match.photoUrl}')` }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[1rem] font-bold leading-snug">{poi.name}</div>
                {category && <div className="mt-[2px] text-[0.6875rem] font-medium text-m-muted">{t(category.labelKey)}</div>}
                {poi.address && <div className="mt-[2px] font-geist text-[0.6875rem] leading-[1.4] text-m-muted">{poi.address}</div>}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t('common.close')}
                className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[color:var(--m-ic)]"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[18px]">
            {details?.rating ? (
              <div className={`mt-3 flex items-center gap-[6px] rounded-[14px] px-3 py-[10px] text-[0.8125rem] font-semibold ${INNER_CLS}`}>
                <Star size={14} fill="#facc15" color="#facc15" className="flex-none" />
                {details.rating.toFixed(1)}
                {details.rating_count ? (
                  <span className="font-normal text-m-muted">({details.rating_count.toLocaleString(getIntlLanguage(language))})</span>
                ) : null}
              </div>
            ) : null}

            {phone && (
              <a href={`tel:${phone}`} className="mt-3 flex items-center gap-[7px] text-[0.78125rem] font-medium">
                <Phone size={13} strokeWidth={2} className="flex-none text-m-muted" />
                {phone}
              </a>
            )}

            {details?.opening_hours?.length ? (
              <div className={`mt-[10px] rounded-[14px] px-3 py-[10px] ${INNER_CLS}`}>
                <Eyebrow className="mb-[4px]">{t('inspector.openingHours')}</Eyebrow>
                {details.opening_hours.map((line, i) => (
                  <div key={line} className={`font-geist text-[0.75rem] leading-[1.6] ${i === todayIndex ? 'font-bold' : 'text-m-muted'}`}>
                    {line}
                  </div>
                ))}
              </div>
            ) : poi.opening_hours ? (
              <div className={`mt-[10px] rounded-[14px] px-3 py-[10px] ${INNER_CLS}`}>
                <Eyebrow className="mb-[4px]">{t('inspector.openingHours')}</Eyebrow>
                <div className="font-geist text-[0.75rem] leading-[1.6] text-m-muted">{poi.opening_hours}</div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              {navTargets.length > 0 && (
                <>
                  <ActionCircle
                    ref={navBtnRef}
                    onClick={directions}
                    label={navTargets.length === 1 ? navTargets[0].label : t('inspector.navigation')}
                  >
                    <Navigation size={15} strokeWidth={2} />
                  </ActionCircle>
                  {navOpen && (
                    <NavigationMenu
                      targets={navTargets}
                      anchor={navBtnRef.current}
                      onClose={() => setNavOpen(false)}
                      title={t('inspector.openWith')}
                    />
                  )}
                </>
              )}
              {website && (
                <ActionCircle
                  onClick={() => window.open(website, '_blank', 'noopener,noreferrer')}
                  label={t('inspector.website')}
                >
                  <ExternalLink size={15} strokeWidth={2} />
                </ActionCircle>
              )}
              {canAdd && (
                <ActionCircle onClick={addToTrip} label={t('common.add')} primary className="ml-auto">
                  <Plus size={15} strokeWidth={2} />
                </ActionCircle>
              )}
            </div>
          </div>
        </>
      )}
    </MSheet>
  )
}
