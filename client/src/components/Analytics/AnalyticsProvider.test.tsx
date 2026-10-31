import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalyticsUnavailable, useAppAnalytics, useOpenAnalyticsPreferences } from '../../hooks/useAppAnalytics';
import { AnalyticsProvider } from './AnalyticsProvider';

vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function RequestEvent() {
  const track = useAppAnalytics();
  const openPreferences = useOpenAnalyticsPreferences();
  const unavailable = useAnalyticsUnavailable();
  return (
    <>
      <button onClick={() => track('trip_plan_requested')}>Request</button>
      <button onClick={openPreferences}>Open preferences</button>
      {unavailable && <p role="status">appAnalytics.unavailable</p>}
    </>
  );
}

function mount(enabled = true) {
  return render(
    <AnalyticsProvider enabled={enabled}>
      <RequestEvent />
    </AnalyticsProvider>
  );
}

describe('app analytics consent and isolation', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the dashboard clear before consent and does not load a frame', () => {
    const view = mount();
    expect(screen.queryByText(/appAnalytics\.description/)).not.toBeInTheDocument();
    expect(view.container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByText('Open preferences'));
    expect(screen.getByText(/appAnalytics\.description/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('vacay.decline'));
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(localStorage.getItem('aventuristur-app-analytics-consent-v2')).toBe('declined');
    view.unmount();
    localStorage.setItem('aventuristur-app-analytics-consent-v2', 'accepted');
    const privatePage = mount(false);
    expect(privatePage.container.querySelector('iframe')).toBeNull();
  });

  it('keeps an old acceptance private until renewed and preserves an old refusal', () => {
    localStorage.setItem('aventuristur-app-analytics-consent', 'accepted');
    const view = mount();
    expect(screen.queryByText(/appAnalytics\.registrationNote/)).not.toBeInTheDocument();
    expect(view.container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByText('Open preferences'));
    expect(screen.getByText(/appAnalytics\.registrationNote/)).toBeInTheDocument();
    view.unmount();
    localStorage.setItem('aventuristur-app-analytics-consent', 'declined');
    const declined = mount();
    expect(declined.container.querySelector('iframe')).toBeNull();
    expect(screen.queryByText(/appAnalytics\.registrationNote/)).not.toBeInTheDocument();
  });

  it('sends only named events to the isolated frame after explicit consent and readiness', () => {
    const view = mount();
    fireEvent.click(screen.getByText('Open preferences'));
    fireEvent.click(screen.getByText('vacay.accept'));
    const frame = view.container.querySelector('iframe');
    if (!frame || !frame.contentWindow) throw new Error('Expected the measurement frame');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
    expect(frame).toHaveAttribute('referrerPolicy', 'no-referrer');
    const target = frame.contentWindow;
    const send = vi.spyOn(target, 'postMessage');
    fireEvent.click(screen.getByText('Request'));
    fireEvent.load(frame);
    expect(send).toHaveBeenCalledWith(
      { type: 'aventuristur-analytics-start', registrationConsent: true },
      'https://aventuristur.com'
    );
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: 'https://evil.example',
        source: target,
        data: { type: 'aventuristur-analytics-status', status: 'ready' },
      })
    );
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: 'https://aventuristur.com',
        source: target,
        data: { type: 'aventuristur-analytics-status', status: 'ready' },
      })
    );
    expect(send).toHaveBeenCalledWith(
      { type: 'aventuristur-analytics-event', event: 'planner_open' },
      'https://aventuristur.com'
    );
    expect(send).toHaveBeenCalledWith(
      { type: 'aventuristur-analytics-event', event: 'trip_plan_requested' },
      'https://aventuristur.com'
    );
    fireEvent.click(screen.getByText('Open preferences'));
    fireEvent.click(screen.getByText('vacay.decline'));
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(localStorage.getItem('aventuristur-app-analytics-consent-v2')).toBe('declined');
  });

  it('removes the frame when the site has declined measurement', () => {
    localStorage.setItem('aventuristur-app-analytics-consent-v2', 'accepted');
    const view = mount();
    const target = view.container.querySelector('iframe')?.contentWindow;
    if (!target) throw new Error('Expected the measurement frame');
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: 'https://aventuristur.com',
        source: target,
        data: { type: 'aventuristur-analytics-status', status: 'site-consent-denied' },
      })
    );
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('appAnalytics.unavailable');
  });
});
