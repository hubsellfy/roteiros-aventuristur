import { useEffect, useState } from 'react'
import { mapsApi } from '../api/client'
import type { PlaceOpeningHours, OpeningPeriod } from '../components/Planner/placeOpenState'

export interface PlaceDetails {
  google_ftid?: string | null
  google_maps_url?: string | null
  lat?: number | null
  lng?: number | null
  rating?: number | null
  rating_count?: number | null
  reviews?: { text?: string | null }[] | null
  opening_hours?: string[] | null
  opening_periods?: OpeningPeriod[] | null
  opening_special_days?: PlaceOpeningHours['specialDays'] | null
  open_now?: boolean | null
  website?: string | null
  phone?: string | null
  summary?: string | null
}

const detailsCache = new Map<string, PlaceDetails>()

function getSessionCache(key: string) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch { return undefined }
}

function setSessionCache(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable: the memory cache still works */ }
}

/**
 * What the keyed provider (Google) or OpenStreetMap knows about a place:
 * rating, opening hours, website. Shared by the desktop inspector and the phone
 * sheet; cached in memory and in sessionStorage so reopening a place is free.
 */
export function usePlaceDetails(googlePlaceId?: string | null, osmId?: string | null, language?: string) {
  const [details, setDetails] = useState<PlaceDetails | null>(null)
  const detailId = googlePlaceId || osmId
  const cacheKey = `gdetails_${detailId}_${language}`
  useEffect(() => {
    if (!detailId) { setDetails(null); return }
    if (detailsCache.has(cacheKey)) { setDetails(detailsCache.get(cacheKey)); return }
    const cached = getSessionCache(cacheKey)
    if (cached) { detailsCache.set(cacheKey, cached); setDetails(cached); return }
    mapsApi.details(detailId, language).then((data: { place: PlaceDetails }) => {
      detailsCache.set(cacheKey, data.place)
      setSessionCache(cacheKey, data.place)
      setDetails(data.place)
    }).catch(() => {})
  }, [detailId, language, cacheKey])
  return details
}
