import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { tripsApi, authApi, reservationsApi, assistantApi } from '../../api/client'
import { tripRepo } from '../../repo/tripRepo'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../i18n'
import { useToast } from '../../components/shared/Toast'
import { getApiErrorMessage } from '../../types'
import { localIsoToday } from './dashboardModel'
import type { TripCreateRequest } from '@trek/shared'
import {
  type DashboardTrip,
  type TravelStats,
  type UpcomingReservation,
  type HeroBundle,
  getTripStatus,
  sortTrips,
} from './dashboardModel'

/**
 * Dashboard data hook — owns every bit of the page's state, data loading and
 * mutations (trip CRUD, archive/copy, travel stats, upcoming reservations,
 * the spotlight hero bundle) and exposes derived values + handlers. The
 * DashboardPage component is a pure wiring container that renders what this
 * returns. Behaviour is identical to the previous in-component logic.
 */
const PLAN_POLL_MS = 4000

export function useDashboard() {
  const [trips, setTrips] = useState<DashboardTrip[]>([])
  const [archivedTrips, setArchivedTrips] = useState<DashboardTrip[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingTrip, setEditingTrip] = useState<DashboardTrip | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('trek_dashboard_view') as 'grid' | 'list') || 'grid')
  const [deleteTrip, setDeleteTrip] = useState<DashboardTrip | null>(null)
  const [copyTrip, setCopyTrip] = useState<DashboardTrip | null>(null)
  const [tripFilter, setTripFilter] = useState<'planned' | 'archive' | 'completed'>('planned')
  const [allSubOpen, setAllSubOpen] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<boolean>(false)

  const [stats, setStats] = useState<TravelStats | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingReservation[]>([])
  const [heroBundle, setHeroBundle] = useState<HeroBundle | null>(null)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const { t, locale } = useTranslation()
  const { demoMode, authCheckFailed, loadUser } = useAuthStore()

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === 'grid' ? 'list' : 'grid'
      localStorage.setItem('trek_dashboard_view', next)
      return next
    })
  }

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  useEffect(() => { loadTrips() }, [])

  // Travel stats + upcoming reservations power the atlas row and the sidebar.
  // Both are best-effort: a failure just leaves that section empty.
  useEffect(() => {
    authApi.travelStats().then(setStats).catch(() => {})
    reservationsApi.upcoming().then((r: { reservations: UpcomingReservation[] }) => setUpcoming(r.reservations || [])).catch(() => {})
  }, [])

  const loadTrips = async () => {
    setIsLoading(true)
    try {
      const { trips, archivedTrips } = await tripRepo.list()
      setTrips(sortTrips(trips))
      setArchivedTrips(sortTrips(archivedTrips))
      setLoadError(false)
    } catch {
      setLoadError(true)
      toast.error(t('dashboard.toast.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Re-run both the trip fetch and the auth check so a recovered backend clears
  // the error banner (loadUser resets authCheckFailed on success). #1283
  const retryLoad = () => {
    loadUser({ silent: true })
    loadTrips()
  }

  // Trips whose AI itinerary is still being built (or failed) wait in the planner
  // section instead of the lists below, which only show ready trips.
  const pendingPlans = trips.filter(t => t.ai_status)
  const readyTrips = trips.filter(t => !t.ai_status)
  const anyBuilding = pendingPlans.some(t => t.ai_status === 'generating')

  // Quiet reload (no spinner, no error toast) while an itinerary is being built, so
  // the card turns into a normal trip the moment the server finishes it.
  const refreshTrips = async () => {
    try {
      const { trips, archivedTrips } = await tripRepo.list()
      setTrips(sortTrips(trips))
      setArchivedTrips(sortTrips(archivedTrips))
    } catch {
      // The next tick tries again.
    }
  }

  useEffect(() => {
    if (!anyBuilding) return
    const timer = setInterval(() => { void refreshTrips() }, PLAN_POLL_MS)
    return () => clearInterval(timer)
  }, [anyBuilding])

  const retryPlan = async (id: number) => {
    try {
      await assistantApi.retryTripPlan(id)
      setTrips(prev => prev.map(t => t.id === id ? { ...t, ai_status: 'generating' } : t))
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('dashboard.toast.createError')))
    }
  }

  const removePlan = async (id: number) => {
    try {
      await tripsApi.delete(id)
      setTrips(prev => prev.filter(t => t.id !== id))
    } catch {
      toast.error(t('dashboard.toast.deleteError'))
    }
  }

  const today = localIsoToday()
  // A trip the hero features on its own merit: one that is running, else the next
  // one coming up. Only that one is taken out of the grid below, so the same trip
  // isn't shown twice.
  const featured = readyTrips.find(t => t.start_date && t.end_date && t.start_date <= today && t.end_date >= today)
    || readyTrips.find(t => t.start_date && t.start_date >= today)
    || null
  // With neither, the hero still shows something rather than sitting empty — but
  // that trip is only borrowed for the header and must stay in the grid, or a user
  // whose trips are all finished (or undated) sees "No trips yet". #1706
  const spotlight = featured || readyTrips[0] || null
  const rest = featured ? readyTrips.filter(t => t.id !== featured.id) : readyTrips

  // Pull the spotlight trip's members + places so the boarding pass can show
  // real buddies and place thumbnails instead of placeholders.
  useEffect(() => {
    if (!spotlight) { setHeroBundle(null); return }
    let cancelled = false
    tripsApi.bundle(spotlight.id)
      .then((b: HeroBundle) => { if (!cancelled) setHeroBundle({ members: b.members || [], places: b.places || [] }) })
      .catch(() => { if (!cancelled) setHeroBundle(null) })
    return () => { cancelled = true }
  }, [spotlight?.id])

  const handleCreate = async (tripData: TripCreateRequest) => {
    try {
      const data = await tripsApi.create(tripData)
      setTrips(prev => sortTrips([data.trip, ...prev]))
      toast.success(t('dashboard.toast.created'))
      return data
    } catch (err: unknown) {
      throw new Error(getApiErrorMessage(err, t('dashboard.toast.createError')))
    }
  }

  const handleUpdate = async (tripData: TripCreateRequest) => {
    if (!editingTrip) return
    try {
      const data = await tripsApi.update(editingTrip.id, tripData)
      setTrips(prev => sortTrips(prev.map(t => t.id === editingTrip.id ? data.trip : t)))
      toast.success(t('dashboard.toast.updated'))
    } catch (err: unknown) {
      throw new Error(getApiErrorMessage(err, t('dashboard.toast.updateError')))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTrip) return
    try {
      await tripsApi.delete(deleteTrip.id)
      setTrips(prev => prev.filter(t => t.id !== deleteTrip.id))
      setArchivedTrips(prev => prev.filter(t => t.id !== deleteTrip.id))
      toast.success(t('dashboard.toast.deleted'))
    } catch {
      toast.error(t('dashboard.toast.deleteError'))
    }
    setDeleteTrip(null)
  }

  const handleArchive = async (id: number) => {
    try {
      const data = await tripsApi.archive(id)
      setTrips(prev => prev.filter(t => t.id !== id))
      setArchivedTrips(prev => sortTrips([data.trip, ...prev]))
      toast.success(t('dashboard.toast.archived'))
    } catch {
      toast.error(t('dashboard.toast.archiveError'))
    }
  }

  const handleUnarchive = async (id: number) => {
    try {
      const data = await tripsApi.unarchive(id)
      setArchivedTrips(prev => prev.filter(t => t.id !== id))
      setTrips(prev => sortTrips([data.trip, ...prev]))
      toast.success(t('dashboard.toast.restored'))
    } catch {
      toast.error(t('dashboard.toast.restoreError'))
    }
  }

  const confirmCopy = async () => {
    if (!copyTrip) return
    try {
      const data = await tripsApi.copy(copyTrip.id, { title: `${copyTrip.title} (${t('dashboard.copySuffix')})` })
      setTrips(prev => sortTrips([data.trip, ...prev]))
      toast.success(t('dashboard.toast.copied'))
    } catch {
      toast.error(t('dashboard.toast.copyError'))
    }
    setCopyTrip(null)
  }

  // The cover can be swapped from the archive filter too, so patch both lists.
  const applyCoverUpdate = (tripId: number, coverUrl: string) => {
    const patch = (list: DashboardTrip[]) => list.map(t => t.id === tripId ? { ...t, cover_image: coverUrl } : t)
    setTrips(patch)
    setArchivedTrips(patch)
  }

  const gridTrips = tripFilter === 'archive' ? archivedTrips
    : tripFilter === 'completed' ? rest.filter(t => getTripStatus(t) === 'past')
    : rest.filter(t => getTripStatus(t) !== 'past')

  return {
    // cross-cutting
    demoMode, locale, t, navigate,
    // data + derived
    spotlight, heroBundle, stats, upcoming, gridTrips, isLoading,
    pendingPlans, refreshTrips, retryPlan, removePlan,
    loadError: loadError || authCheckFailed, retryLoad,
    // ui state
    tripFilter, setTripFilter, viewMode, toggleViewMode,
    showForm, setShowForm, editingTrip, setEditingTrip,
    deleteTrip, setDeleteTrip, copyTrip, setCopyTrip, applyCoverUpdate,
    allSubOpen, setAllSubOpen,
    // actions
    handleCreate, handleUpdate, confirmDelete, handleArchive, handleUnarchive, confirmCopy,
  }
}
