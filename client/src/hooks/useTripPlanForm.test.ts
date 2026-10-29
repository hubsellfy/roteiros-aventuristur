import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createTripPlan = vi.fn();
const track = vi.fn();
vi.mock('./useAppAnalytics', () => ({ useAppAnalytics: () => track }));
vi.mock('../api/client', () => ({ roteiroApi: { createTripPlan: (...a: unknown[]) => createTripPlan(...a) } }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('../components/shared/Toast', () => ({ useToast: () => toast }));
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    locale: 'pt-BR',
  }),
}));

import { planSpanDays, useTripPlanForm } from './useTripPlanForm';

function filled(onCreated = vi.fn()) {
  const hook = renderHook(() => useTripPlanForm(onCreated));
  act(() => {
    hook.result.current.setDestination('  Gramado ');
    hook.result.current.changeStart('2026-12-10');
  });
  return { hook, onCreated };
}

describe('useTripPlanForm', () => {
  beforeEach(() => {
    createTripPlan.mockReset();
    track.mockReset();
    toast.success.mockReset();
  });

  it('FE-HOOK-PLAN-001: counts the days of a period, both ends included', () => {
    expect(planSpanDays('2026-12-10', '2026-12-10')).toBe(1);
    expect(planSpanDays('2026-12-10', '2026-12-14')).toBe(5);
  });

  it('FE-HOOK-PLAN-002: changing the start date keeps the length of the trip', () => {
    const { hook } = filled();
    act(() => hook.result.current.setEndDate('2026-12-14'));
    act(() => hook.result.current.changeStart('2026-12-20'));
    expect(hook.result.current.endDate).toBe('2026-12-24');
  });

  it('FE-HOOK-PLAN-003: refuses a missing destination, missing dates and trips over 14 days', async () => {
    const hook = renderHook(() => useTripPlanForm(vi.fn()));
    await act(() => hook.result.current.submit());
    expect(hook.result.current.error).toBe('dashboard.plan.errDestination');
    act(() => hook.result.current.setDestination('Lisboa'));
    await act(() => hook.result.current.submit());
    expect(hook.result.current.error).toBe('dashboard.plan.errDates');
    act(() => {
      hook.result.current.changeStart('2026-12-01');
      hook.result.current.setEndDate('2026-12-30');
    });
    await act(() => hook.result.current.submit());
    expect(hook.result.current.error).toBe('dashboard.plan.errDays:{"limit":14}');
    expect(createTripPlan).not.toHaveBeenCalled();
  });

  it('FE-HOOK-PLAN-004: sends the request, clears the text fields and tells the dashboard', async () => {
    createTripPlan.mockResolvedValue({ tripId: 5, remaining: 4 });
    const { hook, onCreated } = filled();
    act(() => {
      hook.result.current.setEndDate('2026-12-12');
      hook.result.current.setBudget('1.500,50'.replace('.', ''));
      hook.result.current.setOrigin(' Curitiba ');
    });
    await act(() => hook.result.current.submit());
    expect(createTripPlan).toHaveBeenCalledWith({
      destination: 'Gramado',
      origin: 'Curitiba',
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      budget: 1500.5,
      budgetMode: 'person',
      travelers: 2,
      style: 'economico',
      language: 'pt-BR',
    });
    expect(track).toHaveBeenCalledExactlyOnceWith('trip_plan_requested');
    expect(onCreated).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('dashboard.toast.created');
    expect(hook.result.current.destination).toBe('');
    expect(hook.result.current.submitting).toBe(false);
  });

  it('FE-HOOK-PLAN-005: shows the server reason when the request is refused', async () => {
    createTripPlan.mockRejectedValue({ response: { data: { error: 'Você já tem um roteiro sendo montado.' } } });
    const { hook, onCreated } = filled();
    act(() => hook.result.current.setEndDate('2026-12-12'));
    await act(() => hook.result.current.submit());
    expect(hook.result.current.error).toBe('Você já tem um roteiro sendo montado.');
    expect(track).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('FE-HOOK-PLAN-006: an empty budget goes as null', async () => {
    createTripPlan.mockResolvedValue({ tripId: 5, remaining: null });
    const { hook } = filled();
    act(() => hook.result.current.setEndDate('2026-12-12'));
    await act(() => hook.result.current.submit());
    expect(createTripPlan.mock.calls[0][0]).toMatchObject({ budget: null, origin: null });
  });
});
