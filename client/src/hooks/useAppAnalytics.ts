import { createContext, useContext } from 'react'

export type AnalyticsEvent = 'planner_open' | 'trip_plan_requested'
export const AnalyticsContext = createContext<(event: AnalyticsEvent) => void>(() => undefined)
export const useAppAnalytics = () => useContext(AnalyticsContext)
