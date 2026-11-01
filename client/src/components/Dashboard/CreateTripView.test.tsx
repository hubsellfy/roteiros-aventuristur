import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateTripView from './CreateTripView';

vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CreateTripView', () => {
  it('asks before discarding entered details when returning', () => {
    const back = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <CreateTripView onBack={back}>
        <input aria-label="title" />
      </CreateTripView>
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'title' }), { target: { value: 'Gramado' } });
    fireEvent.click(screen.getByRole('button', { name: /common.back/ }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
