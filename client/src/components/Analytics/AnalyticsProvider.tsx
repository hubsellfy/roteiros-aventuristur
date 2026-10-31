import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { LEGAL_DOCUMENTS } from '../../brand/legalContent';
import { AnalyticsContext, AnalyticsPreferencesContext, type AnalyticsEvent } from '../../hooks/useAppAnalytics';
import { useTranslation } from '../../i18n';

type Choice = 'accepted' | 'declined';
const LEGACY_STORAGE_KEY = 'aventuristur-app-analytics-consent';
const STORAGE_KEY = 'aventuristur-app-analytics-consent-v2';
const BRIDGE_ORIGIN = 'https://aventuristur.com';
const BRIDGE_URL = `${BRIDGE_ORIGIN}/medicao-app-interno`;

function readChoice(): Choice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'accepted' || value === 'declined') return value;
    // Preserve prior refusals; an old acceptance did not cover registrations.
    return localStorage.getItem(LEGACY_STORAGE_KEY) === 'declined' ? 'declined' : null;
  } catch {
    return null;
  }
}

export function AnalyticsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  // First visits stay private by default; preferences are available in account settings.
  const [choice, setChoice] = useState<Choice>(() => readChoice() ?? 'declined');
  const [showPreferences, setShowPreferences] = useState(false);
  const [bridgeError, setBridgeError] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const pending = useRef<AnalyticsEvent[]>([]);
  const openPreferences = useCallback(() => setShowPreferences(true), []);

  const send = useCallback(
    (event: AnalyticsEvent) => {
      if (!enabled || choice !== 'accepted') return;
      if (!ready.current) {
        if (pending.current.length < 10) pending.current.push(event);
        return;
      }
      frame.current?.contentWindow?.postMessage({ type: 'aventuristur-analytics-event', event }, BRIDGE_ORIGIN);
    },
    [enabled, choice]
  );

  useLayoutEffect(() => {
    if (!enabled || choice !== 'accepted') {
      ready.current = false;
      pending.current = [];
      return;
    }
    const timer = window.setTimeout(() => {
      if (!ready.current) setBridgeError(true);
    }, 10000);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== BRIDGE_ORIGIN || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== 'aventuristur-analytics-status') return;
      window.clearTimeout(timer);
      if (event.data.status !== 'ready') {
        ready.current = false;
        pending.current = [];
        setBridgeError(true);
        return;
      }
      if (ready.current) return;
      ready.current = true;
      setBridgeError(false);
      const queued = pending.current.splice(0);
      frame.current?.contentWindow?.postMessage(
        { type: 'aventuristur-analytics-event', event: 'planner_open' },
        BRIDGE_ORIGIN
      );
      queued.forEach((name) =>
        frame.current?.contentWindow?.postMessage({ type: 'aventuristur-analytics-event', event: name }, BRIDGE_ORIGIN)
      );
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      ready.current = false;
      pending.current = [];
    };
  }, [enabled, choice]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setChoice(readChoice() ?? 'declined');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!showPreferences) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPreferences(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showPreferences]);

  const choose = (value: Choice) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* The choice lasts only in this tab. */
    }
    setChoice(value);
    setShowPreferences(false);
    setBridgeError(false);
  };

  return (
    <AnalyticsPreferencesContext.Provider value={openPreferences}>
      <AnalyticsContext.Provider value={send}>
        {enabled && choice === 'accepted' && !bridgeError && (
          <iframe
            ref={frame}
            src={BRIDGE_URL}
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            title={t('appAnalytics.title')}
            hidden
            onLoad={() =>
              frame.current?.contentWindow?.postMessage(
                { type: 'aventuristur-analytics-start', registrationConsent: true },
                BRIDGE_ORIGIN
              )
            }
          />
        )}
        {showPreferences && (
          <div
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center overflow-y-auto bg-[var(--overlay)] p-4 text-content"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowPreferences(false);
            }}
          >
            <section
              aria-labelledby="app-analytics-preferences-title"
              aria-modal="true"
              className="w-full max-w-lg rounded-xl border border-edge bg-surface-card p-4 shadow-2xl"
              role="dialog"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="app-analytics-preferences-title" className="m-0 font-semibold">
                  {t('appAnalytics.title')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="rounded-lg border border-edge px-3 py-1.5"
                >
                  {t('common.cancel')}
                </button>
              </div>
              <p className="mt-1 text-content-secondary">
                {t('appAnalytics.description')} {t('appAnalytics.registrationNote')}
              </p>
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-accent-on underline">
                {LEGAL_DOCUMENTS.privacidade.title}
              </a>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => choose('accepted')}
                  className="rounded-lg bg-accent px-4 py-2 text-accent-text"
                >
                  {t('vacay.accept')}
                </button>
                <button
                  type="button"
                  onClick={() => choose('declined')}
                  className="rounded-lg border border-edge px-4 py-2"
                >
                  {t('vacay.decline')}
                </button>
              </div>
            </section>
            {bridgeError && (
              <p role="status" className="text-content-muted">
                {t('appAnalytics.unavailable')}
              </p>
            )}
          </div>
        )}
        {children}
      </AnalyticsContext.Provider>
    </AnalyticsPreferencesContext.Provider>
  );
}
