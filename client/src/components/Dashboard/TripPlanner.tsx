import React from 'react'
import { TRIP_PLAN_STYLES } from '@trek/shared'
import { ArrowRight, MapPin, Navigation, RefreshCw, Sparkles, Trash2, Wallet } from '../../icons'
import { useTranslation } from '../../i18n'
import { useTripPlanForm } from '../../hooks/useTripPlanForm'
import { CustomDatePicker } from '../shared/CustomDateTimePicker'
import CustomSelect from '../shared/CustomSelect'
import { Spinner } from '../shared/Spinner'
import type { Trip } from '../../types'

interface TripPlannerProps {
  /** Trips whose itinerary is being built or has failed. */
  pending: Trip[]
  /** Called after the server accepted a request, so the list can reload. */
  onCreated: () => void
  onRetry: (tripId: number) => void
  onRemove: (tripId: number) => void
}

const TRAVELER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

const fieldCls = 'flex min-w-0 items-center gap-3 rounded-full border border-edge bg-surface-card px-[18px] py-3 text-content transition-colors focus-within:border-accent'
const inputCls = 'min-w-0 flex-1 !bg-transparent !shadow-none text-[0.9375rem] text-content outline-none placeholder:text-content-faint'
const labelCls = 'mb-1.5 ml-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-content-muted'

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-w-0">
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  )
}

/**
 * "Para onde vamos?" — the AI itinerary simulator that opens the dashboard,
 * plus the cards of itineraries still being built. One component for the phone
 * and the desktop dashboard, so the logic and the markup live in one place.
 */
export default function TripPlanner({ pending, onCreated, onRetry, onRemove }: TripPlannerProps): React.ReactElement {
  const { t } = useTranslation()
  const form = useTripPlanForm(onCreated)

  const styleOptions = TRIP_PLAN_STYLES.filter(value => value !== 'equilibrado').map(value => ({ value, label: t(`dashboard.plan.style.${value}`) }))
  const travelerOptions = TRAVELER_OPTIONS.map(n => ({
    value: n,
    label: n === 1 ? t('dashboard.plan.travelersOne') : t('dashboard.plan.travelersMany', { count: n }),
  }))

  return (
    <section aria-labelledby="trip-planner-title" className="mb-5">
      <form
        onSubmit={e => { e.preventDefault(); void form.submit() }}
        noValidate
        className="overflow-hidden rounded-[28px] border border-edge bg-surface-card"
      >
        <div
          role="img"
          aria-hidden
          className="relative h-40 bg-cover bg-center md:h-52"
          style={{ backgroundImage: 'url(/images/criador-roteiro-ceu.jpg)' }}
        >
          <h2
            id="trip-planner-title"
            className="absolute inset-x-0 top-5 px-6 text-center text-[1.75rem] font-normal leading-none text-white [text-shadow:0_2px_14px_rgba(10,60,120,0.45)] md:top-6 md:text-[2.25rem]"
            style={{ fontFamily: "'Indie Flower', cursive" }}
          >
            {t('dashboard.plan.title')}
          </h2>
        </div>
        <div className="relative -mt-6 rounded-t-[28px] bg-surface-card p-5 md:p-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('dashboard.plan.destination')}>
            <label className={fieldCls}>
              <MapPin size={20} strokeWidth={1} className="flex-none text-accent" />
              <input
                className={inputCls}
                value={form.destination}
                onChange={e => form.setDestination(e.target.value)}
                placeholder={t('dashboard.plan.destinationPh')}
                maxLength={120}
                autoComplete="off"
                enterKeyHint="next"
              />
            </label>
          </Field>
          <Field label={t('dashboard.plan.origin')}>
            <label className={fieldCls}>
              <Navigation size={20} strokeWidth={1} className="flex-none text-content-muted" />
              <input
                className={inputCls}
                value={form.origin}
                onChange={e => form.setOrigin(e.target.value)}
                placeholder={t('dashboard.plan.originPh')}
                maxLength={120}
                autoComplete="off"
                enterKeyHint="next"
              />
            </label>
          </Field>

          <div className="md:col-span-2">
            <span className={labelCls}>{t('dashboard.plan.dates')}</span>
            <div className="grid grid-cols-2 gap-3">
              <CustomDatePicker value={form.startDate} onChange={form.changeStart} placeholder={t('dashboard.startDate')} hideManualEntry pill />
              <CustomDatePicker value={form.endDate} onChange={form.setEndDate} placeholder={t('dashboard.endDate')} min={form.startDate || undefined} hideManualEntry pill />
            </div>
          </div>

          <Field label={t('dashboard.plan.budget')}>
            <div className="flex items-center gap-2">
              <label className={`${fieldCls} flex-1`}>
                <Wallet size={20} strokeWidth={1} className="flex-none text-accent" />
                <input
                  className={inputCls}
                  value={form.budget}
                  onChange={e => form.setBudget(e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder={t('dashboard.plan.budgetPh')}
                  inputMode="decimal"
                  maxLength={12}
                />
              </label>
              <div className="w-[9.5rem] flex-none">
                <CustomSelect
                  pill
                  value={form.budgetMode}
                  onChange={v => form.setBudgetMode(v === 'total' ? 'total' : 'person')}
                  options={[
                    { value: 'person', label: t('dashboard.plan.perPerson') },
                    { value: 'total', label: t('dashboard.plan.total') },
                  ]}
                />
              </div>
            </div>
          </Field>
          <Field label={t('dashboard.plan.travelers')}>
            <CustomSelect pill value={form.travelers} onChange={v => form.setTravelers(Number(v))} options={travelerOptions} />
          </Field>

          <div className="md:col-span-2">
            <Field label={t('dashboard.plan.style')}>
              <CustomSelect pill value={form.style} onChange={v => form.setStyle(TRIP_PLAN_STYLES.find(x => x === v) ?? 'economico')} options={styleOptions} />
            </Field>
          </div>
        </div>

        {form.error && (
          <p role="alert" className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-[0.8125rem] font-medium text-danger">{form.error}</p>
        )}

        <button
          type="submit"
          disabled={form.submitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full !bg-accent px-6 py-[0.9rem] text-[1rem] font-semibold !text-white transition-colors hover:!bg-accent-hover disabled:opacity-60"
        >
          {form.submitting ? <Spinner className="h-5 w-5 border-2 border-white/40 border-t-white" /> : <Sparkles size={20} strokeWidth={1} />}
          {t('dashboard.plan.generate')}
          {!form.submitting && <ArrowRight size={20} strokeWidth={1} />}
        </button>
        <p className="mt-3 text-center text-[0.75rem] leading-snug text-content-faint">{t('dashboard.plan.disclaimer')}</p>
        </div>
      </form>

      {pending.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 ml-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-content-muted">{t('dashboard.plan.pendingTitle')}</h3>
          <ul className="flex flex-col gap-3">
            {pending.map(trip => (
              <PendingPlanCard key={trip.id} trip={trip} onRetry={() => onRetry(trip.id)} onRemove={() => onRemove(trip.id)} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function PendingPlanCard({ trip, onRetry, onRemove }: { trip: Trip; onRetry: () => void; onRemove: () => void }): React.ReactElement {
  const { t } = useTranslation()
  const failed = trip.ai_status === 'failed'
  return (
    <li className="flex items-center gap-3 rounded-[22px] border border-edge bg-surface-card p-4" aria-live="polite">
      <span aria-hidden className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${failed ? 'bg-danger-soft text-danger' : 'bg-accent-subtle text-accent'}`}>
        {failed ? <RefreshCw size={20} strokeWidth={1} /> : <Spinner className="h-5 w-5 border-2 border-accent/30 border-t-accent" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold text-content">{trip.title}</p>
        <p className="text-[0.8125rem] leading-snug text-content-muted">{failed ? t('dashboard.plan.failed') : t('dashboard.plan.working')}</p>
      </div>
      {failed && (
        <div className="flex flex-none items-center gap-2">
          <button type="button" onClick={onRetry} className="rounded-full !bg-accent px-4 py-2 text-[0.8125rem] font-semibold !text-white hover:!bg-accent-hover">
            {t('dashboard.plan.retry')}
          </button>
          <button type="button" onClick={onRemove} aria-label={t('dashboard.plan.remove')} title={t('dashboard.plan.remove')} className="flex h-9 w-9 items-center justify-center rounded-full border border-edge text-content-muted hover:bg-surface-hover">
            <Trash2 size={18} strokeWidth={1} />
          </button>
        </div>
      )}
    </li>
  )
}
