import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { publicSiteAuthUrl, type PublicAuthMode } from './publicSiteAuthUrl';

export default function PublicSiteAuthRedirect({ mode, fallback }: { mode: PublicAuthMode; fallback?: ReactNode }) {
  const location = useLocation();
  const hasOidcCallback =
    mode === 'login' &&
    (() => {
      const params = new URLSearchParams(location.search);
      return params.has('oidc_code') || params.has('oidc_error');
    })();
  const destination = publicSiteAuthUrl(mode, location.search);

  useEffect(() => {
    if (!hasOidcCallback) window.location.replace(destination);
  }, [destination, hasOidcCallback]);

  if (hasOidcCallback) {
    return <>{fallback ?? <p role="status">Concluindo o acesso seguro…</p>}</>;
  }

  return (
    <p role="status" className="sr-only">
      Abrindo o acesso da Aventuristur…
    </p>
  );
}
