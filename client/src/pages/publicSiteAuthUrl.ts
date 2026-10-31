export type PublicAuthMode = 'login' | 'register';

/** Preserve only the app return path and invitation when leaving the app. */
export function publicSiteAuthUrl(mode: PublicAuthMode, search: string, origin = publicSiteOrigin()): string {
  const site = new URL(origin);
  if (site.protocol !== 'https:' && !(site.protocol === 'http:' && site.hostname === '127.0.0.1')) {
    throw new Error('The public site auth origin must use HTTPS');
  }

  const target = new URL(`/${mode}`, site.origin);
  const incoming = new URLSearchParams(search);
  for (const key of ['redirect', 'invite']) {
    const value = incoming.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return target.toString();
}

function publicSiteOrigin(): string {
  return (
    import.meta.env.VITE_PUBLIC_SITE_ORIGIN ||
    (import.meta.env.DEV ? 'http://127.0.0.1:3100' : 'https://aventuristur.com')
  );
}
