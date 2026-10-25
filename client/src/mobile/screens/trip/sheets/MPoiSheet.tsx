import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Navigation, Phone, Plus, X } from 'lucide-react'
import MSheet from '../../../components/MSheet'
import type { MTripSheetsProps } from '../MTripShell'
import { useTranslation, getIntlLanguage } from '../../../../i18n'
import { mapsApi } from '../../../../api/client'
import { usePlaceDetails } from '../../../../hooks/usePlaceDetails'
import { poiCategoryOf, type Poi } from '../../../../components/Map/poiCategories'
import { getNavigationTargets, openNavigationTarget } from '../../../../components/Planner/placeNavigation'
import { NavigationMenu } from '../../../../components/shared/NavigationMenu'
import { formatPoiName } from '../../../../utils/formatPoiName'
import { safeHttpUrl } from '../../../../utils/safeUrl'
import { ActionCircle } from './MTripSheetUi'
import MGoogleInfo from './MGoogleInfo'

// Photos shown in the strip of a card: enough to get a feel for the place
// without turning a tap into a gallery download.
const MAX_PHOTOS = 6

interface GoogleMatch {
  googleId: string
  photos: string[]
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
    // Google's own pictures only: the other sources the enrichment fans out to
    // (Wikimedia and friends) are licensed images that would need a credit line.
    const enrichment = await mapsApi
      .placeEnrichment({ placeId: hit.google_place_id, lat: poi.lat, lng: poi.lng, name: poi.name, lang: language })
      .catch(() => null)
    const photos = (enrichment?.photos ?? [])
      .filter(p => p.source === 'google' || p.source === 'cached')
      .slice(0, MAX_PHOTOS)
      .map(p => p.url)
    return { googleId: hit.google_place_id, photos }
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

  const details = usePlaceDetails(match?.googleId, null, language, true)
  const category = poi ? poiCategoryOf(poi.category) : undefined
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
              <div className="min-w-0 flex-1">
                <div className="text-[1rem] font-bold leading-snug">{formatPoiName(poi.name)}</div>
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
            {match && match.photos.length > 0 && (
              <div className="-mx-[18px] mt-3 flex snap-x gap-2 overflow-x-auto px-[18px] pb-1">
                {match.photos.map(url => (
                  <img
                    key={url}
                    src={url}
                    alt={poi.name}
                    loading="lazy"
                    className="h-[120px] w-[160px] flex-none snap-start rounded-[14px] object-cover"
                  />
                ))}
              </div>
            )}

            <MGoogleInfo details={details} language={language} />

            {phone && (
              <a href={`tel:${phone}`} className="mt-3 flex items-center gap-[7px] text-[0.78125rem] font-medium">
                <Phone size={13} strokeWidth={2} className="flex-none text-m-muted" />
                {phone}
              </a>
            )}

            {!details?.opening_hours?.length && poi.opening_hours ? (
              <div className="mt-[10px] font-geist text-[0.75rem] leading-[1.6] text-m-muted">{poi.opening_hours}</div>
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
