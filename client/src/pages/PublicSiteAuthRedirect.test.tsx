import { describe, expect, it } from 'vitest';
import { publicSiteAuthUrl } from './publicSiteAuthUrl';

describe('publicSiteAuthUrl', () => {
  it('sends login to the public site and keeps the protected destination', () => {
    expect(publicSiteAuthUrl('login', '?redirect=%2Fdashboard%3Ftab%3Dtrips', 'https://aventuristur.com')).toBe(
      'https://aventuristur.com/login?redirect=%2Fdashboard%3Ftab%3Dtrips'
    );
  });

  it('sends registration to the public site and preserves the invite token', () => {
    expect(
      publicSiteAuthUrl('register', '?invite=invite-token&redirect=%2Fjoin%2Ftrip', 'https://aventuristur.com')
    ).toBe('https://aventuristur.com/register?redirect=%2Fjoin%2Ftrip&invite=invite-token');
  });

  it('does not forward unrelated authentication callback parameters', () => {
    expect(publicSiteAuthUrl('login', '?oidc_code=secret&redirect=%2Fdashboard', 'https://aventuristur.com')).toBe(
      'https://aventuristur.com/login?redirect=%2Fdashboard'
    );
  });

  it('rejects an insecure public origin outside local development', () => {
    expect(() => publicSiteAuthUrl('login', '', 'http://aventuristur.com')).toThrow(
      'The public site auth origin must use HTTPS'
    );
  });
});
