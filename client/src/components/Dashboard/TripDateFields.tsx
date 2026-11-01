import React from 'react';
import { useTranslation } from '../../i18n';
import { CustomDatePicker } from '../shared/CustomDateTimePicker';

export default function TripDateFields({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div>
      <span className="mb-1.5 ms-1 block text-caption font-semibold uppercase tracking-[0.08em] text-content-muted">
        {t('dashboard.plan.dates')}
      </span>
      <div className="grid grid-cols-2 gap-3">
        <CustomDatePicker
          value={startDate}
          onChange={onStartChange}
          placeholder={t('dashboard.startDate')}
          hideManualEntry
        />
        <CustomDatePicker
          value={endDate}
          onChange={onEndChange}
          placeholder={t('dashboard.endDate')}
          min={startDate || undefined}
          hideManualEntry
        />
      </div>
    </div>
  );
}
