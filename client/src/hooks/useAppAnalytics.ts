import { createContext, useContext } from 'react';

export type AnalyticsEvent = 'planner_open' | 'trip_plan_requested';
export const AnalyticsContext = createContext<(event: AnalyticsEvent) => void>(() => undefined);
export const useAppAnalytics = () => useContext(AnalyticsContext);

export const AnalyticsPreferencesContext = createContext<() => void>(() => undefined);
export const useOpenAnalyticsPreferences = () => useContext(AnalyticsPreferencesContext);

export const AnalyticsUnavailableContext = createContext(false);
export const useAnalyticsUnavailable = () => useContext(AnalyticsUnavailableContext);
