import { AlertTriangle } from '../../../icons';
import {
  DialogButton,
  DialogFooter,
  DialogHeader,
  DialogShell,
  DialogTile,
  FooterSpacer,
  fs,
} from '../../shared/DialogShell';
import type { T } from './pluginModel';

const WARN_TINT = 'color-mix(in srgb, var(--warning) 10%, transparent)';

/**
 * The TREK_PLUGINS_IGNORE_TREK_RANGE warning (copy and modes from useRangeBypass). Its own
 * component rather than ConfirmDialog because the notice mode has no cancel button.
 */
export default function RangeBypassDialog({
  copy: { title, body, confirm, confirmLabel },
  onConfirm,
  onClose,
  t,
}: {
  copy: { title: string; body: string; confirm: boolean; confirmLabel: string };
  onConfirm: () => void;
  onClose: () => void;
  t: T;
}) {
  return (
    <DialogShell
      onClose={onClose}
      labelledBy="plugin-range-bypass-title"
      width="narrow"
      header={
        <DialogHeader
          tile={
            <DialogTile>
              <span className="text-warning">
                <AlertTriangle size={20} />
              </span>
            </DialogTile>
          }
          tint={WARN_TINT}
          labelId="plugin-range-bypass-title"
          title={title}
          onClose={onClose}
        />
      }
      footer={
        <DialogFooter>
          <FooterSpacer />
          {confirm ? (
            <>
              <DialogButton onClick={onClose}>{t('common.cancel')}</DialogButton>
              <DialogButton variant="primary" onClick={onConfirm}>
                {confirmLabel}
              </DialogButton>
            </>
          ) : (
            <DialogButton variant="primary" onClick={onClose}>
              {t('common.ok')}
            </DialogButton>
          )}
        </DialogFooter>
      }
    >
      <p className="m-0 leading-relaxed text-content-secondary" style={fs(13.5, 'body')}>
        {body}
      </p>
    </DialogShell>
  );
}
