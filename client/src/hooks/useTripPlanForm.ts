import { TRIP_PLAN_MAX_DAYS, type TripPlanStyle } from '@trek/shared';
import { useState } from 'react';
import { roteiroApi } from '../api/client';
import { useToast } from '../components/shared/Toast';
import { useTranslation } from '../i18n';
import { getApiErrorMessage } from '../utils/apiError';

const MS_PER_DAY = 86_400_000;

/** Whole days from start to end, both included; NaN when either is not a date. */
export function planSpanDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / MS_PER_DAY) + 1;
}

/**
 * State and submission of the "Para onde vamos?" simulator. The trip card is
 * created by the server at once; `onCreated` lets the dashboard reload its list
 * so the card shows up while the itinerary is still being built.
 */
export function useTripPlanForm(onCreated: () => void) {
  const { t, locale } = useTranslation();
  const toast = useToast();
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetMode, setBudgetMode] = useState<'person' | 'total'>('person');
  const [travelers, setTravelers] = useState(2);
  const [style, setStyle] = useState<TripPlanStyle>('economico');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moving the start date drags the end date along, keeping the length the traveller picked.
  const changeStart = (value: string) => {
    if (value && endDate && startDate && endDate >= startDate) {
      const shifted = new Date(
        Date.parse(`${value}T00:00:00Z`) + (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`))
      );
      setEndDate(shifted.toISOString().slice(0, 10));
    } else if (value && (!endDate || endDate < value)) {
      setEndDate(value);
    }
    setStartDate(value);
  };

  const validate = (): string | null => {
    if (destination.trim().length < 2) return t('dashboard.plan.errDestination');
    if (!startDate || !endDate || endDate < startDate) return t('dashboard.plan.errDates');
    if (planSpanDays(startDate, endDate) > TRIP_PLAN_MAX_DAYS)
      return t('dashboard.plan.errDays', { limit: TRIP_PLAN_MAX_DAYS });
    return null;
  };

  const submit = async () => {
    if (submitting) return;
    const problem = validate();
    setError(problem);
    if (problem) return;
    const amount = Number(budget.replace(',', '.'));
    setSubmitting(true);
    try {
      await roteiroApi.createTripPlan({
        destination: destination.trim(),
        origin: origin.trim() || null,
        startDate,
        endDate,
        budget: budget.trim() && Number.isFinite(amount) && amount >= 0 ? amount : null,
        budgetMode,
        travelers,
        style,
        language: locale,
      });
      toast.success(t('dashboard.toast.created'));
      setDestination('');
      setOrigin('');
      setBudget('');
      onCreated();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('dashboard.toast.createError')));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    destination,
    setDestination,
    origin,
    setOrigin,
    startDate,
    changeStart,
    endDate,
    setEndDate,
    budget,
    setBudget,
    budgetMode,
    setBudgetMode,
    travelers,
    setTravelers,
    style,
    setStyle,
    submitting,
    error,
    submit,
  };
}
