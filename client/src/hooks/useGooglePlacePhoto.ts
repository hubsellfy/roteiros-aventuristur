import { useEffect, useState } from 'react';
import { mapsApi } from '../api/client';

// One lookup per place and language for the whole session: the picture is billed by Google.
const photoCache = new Map<string, Promise<string | null>>();

function lookup(googlePlaceId: string, lat: number, lng: number, name: string, lang: string): Promise<string | null> {
  const key = `${googlePlaceId}_${lang}`;
  const cached = photoCache.get(key);
  if (cached) return cached;
  const promise = mapsApi
    .placeEnrichment({ placeId: googlePlaceId, lat, lng, name, lang })
    .then(
      (res) =>
        res.photos.find((p: { source: string; url: string }) => p.source === 'google' || p.source === 'cached')?.url ??
        null
    );
  // A failure (no key, quota, offline) is not remembered, so the next card tries again.
  promise.catch(() => photoCache.delete(key));
  photoCache.set(key, promise);
  return promise;
}

/** First Google picture of a place, or null while loading / when there is none. */
export function useGooglePlacePhoto(
  googlePlaceId: string | null | undefined,
  lat: number,
  lng: number,
  name: string,
  lang: string
) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!googlePlaceId) return;
    let alive = true;
    lookup(googlePlaceId, lat, lng, name, lang)
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [googlePlaceId, lat, lng, name, lang]);
  return url;
}
