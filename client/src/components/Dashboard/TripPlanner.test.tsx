import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (k: string) => k, locale: 'pt-BR' }) }));
vi.mock('../../hooks/useTripPlanForm', () => ({
  useTripPlanForm: () => ({
    destination: '',
    setDestination: vi.fn(),
    origin: '',
    setOrigin: vi.fn(),
    startDate: '',
    changeStart: vi.fn(),
    endDate: '',
    setEndDate: vi.fn(),
    budget: '',
    setBudget: vi.fn(),
    budgetMode: 'person',
    setBudgetMode: vi.fn(),
    travelers: 2,
    setTravelers: vi.fn(),
    style: 'economico',
    setStyle: vi.fn(),
    submitting: false,
    error: 'dashboard.plan.errDestination',
    submit: vi.fn(),
  }),
}));

import type { Trip } from '../../types';
import TripPlanner, { PendingPlans } from './TripPlanner';

const trip = (over: Partial<Trip>): Trip => ({
  id: 1,
  user_id: 1,
  title: 'Gramado',
  currency: 'BRL',
  is_archived: 0,
  reminder_days: 0,
  ...over,
});

describe('TripPlanner', () => {
  it('shows manual creation without the AI disclaimer', () => {
    render(
      <TripPlanner pending={[]} onCreated={vi.fn()} onRetry={vi.fn()} onRemove={vi.fn()} manualCreate={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /dashboard.createTrip/ })).toBeTruthy();
    expect(screen.queryByText('dashboard.plan.disclaimer')).toBeNull();
  });

  it('keeps old failed requests removable while retry is hidden', () => {
    const remove = vi.fn();
    render(
      <PendingPlans
        pending={[trip({ id: 7, ai_status: 'failed' })]}
        onRetry={vi.fn()}
        onRemove={remove}
        allowRetry={false}
      />
    );
    expect(screen.queryByText('dashboard.plan.retry')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.plan.remove' }));
    expect(remove).toHaveBeenCalledWith(7);
  });
  it('keeps failed generation actions available without showing the creation form', () => {
    const retry = vi.fn();
    render(<PendingPlans pending={[trip({ id: 7, ai_status: 'failed' })]} onRetry={retry} onRemove={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /dashboard.plan.generate/ })).toBeNull();
    fireEvent.click(screen.getByText('dashboard.plan.retry'));
    expect(retry).toHaveBeenCalledWith(7);
  });
  it('FE-COMP-PLANNER-001: shows the simulator, its error and no pending list when nothing is being built', () => {
    render(<TripPlanner pending={[]} onCreated={vi.fn()} onRetry={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('dashboard.plan.title')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('dashboard.plan.errDestination');
    expect(screen.getByRole('button', { name: /dashboard.plan.generate/ })).toBeTruthy();
    expect(screen.queryByText('dashboard.plan.pendingTitle')).toBeNull();
  });

  it('FE-COMP-PLANNER-002: a trip being built shows progress and no actions', () => {
    render(
      <TripPlanner
        pending={[trip({ ai_status: 'generating' })]}
        onCreated={vi.fn()}
        onRetry={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('dashboard.plan.pendingTitle')).toBeTruthy();
    expect(screen.getByText('dashboard.plan.working')).toBeTruthy();
    expect(screen.queryByText('dashboard.plan.retry')).toBeNull();
  });

  it('FE-COMP-PLANNER-003: a failed trip can be retried or removed', () => {
    const onRetry = vi.fn();
    const onRemove = vi.fn();
    render(
      <TripPlanner
        pending={[trip({ id: 7, ai_status: 'failed' })]}
        onCreated={vi.fn()}
        onRetry={onRetry}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText('dashboard.plan.failed')).toBeTruthy();
    fireEvent.click(screen.getByText('dashboard.plan.retry'));
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.plan.remove' }));
    expect(onRetry).toHaveBeenCalledWith(7);
    expect(onRemove).toHaveBeenCalledWith(7);
  });
});
