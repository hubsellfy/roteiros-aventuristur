import { resolveOpenNow } from '../../../../components/Planner/placeOpenState';
import type { PlaceDetails } from '../../../../hooks/usePlaceDetails';
import { getIntlLanguage, useTranslation } from '../../../../i18n';
import { Star } from '../../../../icons';
import { Eyebrow, INNER_CLS } from './MTripSheetUi';

/** "segunda-feira: 18:30 – 23:00" → ["Segunda", "18:30 – 23:00"]. */
function splitHoursLine(line: string): [string, string] {
  const at = line.indexOf(':');
  if (at < 0) return [line, ''];
  const day = line
    .slice(0, at)
    .trim()
    .replace(/-feira$/i, '');
  return [day.charAt(0).toUpperCase() + day.slice(1), line.slice(at + 1).trim()];
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex flex-none items-center gap-[1px]" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          fill={n <= Math.round(value) ? '#facc15' : 'none'}
          color={n <= Math.round(value) ? '#facc15' : 'currentColor'}
          className={n <= Math.round(value) ? '' : 'text-m-muted'}
        />
      ))}
    </span>
  );
}

/**
 * What Google knows about a place, as three cards for the phone sheets: the
 * rating, the opening hours as a day/time table with today picked out, and the
 * written reviews. Each card is left out when the data is not there, so a place
 * Google does not know renders nothing at all.
 */
export default function MGoogleInfo({ details, language }: { details: PlaceDetails | null; language: string }) {
  const { t } = useTranslation();
  if (!details) return null;
  // weekdayDescriptions[0] is Monday; Date#getDay() starts on Sunday.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const openNow = resolveOpenNow(
    { periods: details.opening_periods, specialDays: details.opening_special_days },
    details.lat,
    details.lng,
    details.open_now
  );
  const reviews = (details.reviews ?? []).filter((r) => r.text);

  return (
    <>
      {details.rating ? (
        <div className={`mt-3 flex items-center gap-[8px] rounded-[14px] px-3 py-[10px] ${INNER_CLS}`}>
          <span className="text-[1.125rem] font-bold leading-none">{details.rating.toFixed(1)}</span>
          <Stars value={details.rating} />
          {details.rating_count ? (
            <span className="text-[0.75rem] text-m-muted">
              ({details.rating_count.toLocaleString(getIntlLanguage(language))})
            </span>
          ) : null}
          {openNow != null && (
            <span
              className={`ms-auto rounded-full px-[9px] py-[3px] text-[0.6875rem] font-semibold ${openNow ? 'bg-[color:var(--m-st-ok-bg,rgba(34,197,94,0.15))] text-[#22c55e]' : 'bg-[color:var(--m-st-danger-bg,rgba(239,68,68,0.15))] text-[#ef4444]'}`}
            >
              {openNow ? t('inspector.opened') : t('inspector.closed')}
            </span>
          )}
        </div>
      ) : null}

      {details.opening_hours?.length ? (
        <div className={`mt-[10px] rounded-[14px] px-3 py-[10px] ${INNER_CLS}`}>
          <Eyebrow className="mb-[6px]">{t('inspector.openingHours')}</Eyebrow>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[3px] font-geist text-[0.75rem] leading-[1.5]">
            {details.opening_hours.map((line, i) => {
              const [day, hours] = splitHoursLine(line);
              const today = i === todayIndex;
              return (
                <div key={line} className={`contents ${today ? 'font-bold' : 'text-m-muted'}`}>
                  <span>{day}</span>
                  <span className="text-end">{hours}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {reviews.length > 0 && (
        <>
          <Eyebrow className="mb-[6px] mt-3">{t('inspector.reviews')}</Eyebrow>
          <div className="flex flex-col gap-2">
            {reviews.map((r) => (
              <div
                key={`${r.author}-${r.time}-${r.text?.slice(0, 20)}`}
                className={`rounded-[14px] px-3 py-[10px] ${INNER_CLS}`}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-[0.75rem] font-semibold">{r.author}</span>
                  {r.rating ? <Stars value={r.rating} /> : null}
                  {r.time ? <span className="ms-auto flex-none text-[0.6875rem] text-m-muted">{r.time}</span> : null}
                </div>
                <p className="mt-[4px] line-clamp-5 font-geist text-[0.75rem] leading-[1.5] text-m-muted [overflow-wrap:anywhere]">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
