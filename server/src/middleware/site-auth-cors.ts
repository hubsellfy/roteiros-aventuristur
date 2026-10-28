const SITE_AUTH_ROUTES = new Set([
  'GET /api/auth/site/app-config',
  'GET /api/auth/site/me',
  'PUT /api/auth/site/me/password',
  'POST /api/auth/site/register',
  'POST /api/auth/site/login',
  'POST /api/auth/site/forgot-password',
  'POST /api/auth/site/reset-password',
  'POST /api/auth/site/mfa/verify-login',
]);

/** Restricts credentialed CORS to the public site's account and recovery flows. */
export function isSiteAuthCorsRequest(
  method: string,
  path: string,
  requestedMethod: string | string[] | undefined,
): boolean {
  const effectiveMethod = method.toUpperCase() === 'OPTIONS' ? firstHeaderValue(requestedMethod) : method.toUpperCase();
  if (!effectiveMethod) return false;
  if (SITE_AUTH_ROUTES.has(`${effectiveMethod} ${path}`)) return true;
  return effectiveMethod === 'GET' && /^\/api\/auth\/site\/invite\/[^/]+$/.test(path);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const header = Array.isArray(value) ? value[0] : value;
  return header?.trim().toUpperCase() || undefined;
}
