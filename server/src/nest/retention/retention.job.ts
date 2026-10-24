import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { logError, logInfo } from '../audit/audit-log.logger';
import { CronRegistrarService } from '../scheduling/cron-registrar.service';
import { RetentionService } from './retention.service';

/**
 * Daily retention sweep (04:10, clear of the 03:00 purge and the backup window).
 * Off unless RETENTION_MONTHS is set; erases only when RETENTION_DRY_RUN=false.
 */
@Injectable()
export class RetentionJob implements OnApplicationBootstrap {
  constructor(
    private readonly retention: RetentionService,
    private readonly registrar: CronRegistrarService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.registrar.isEnabled()) return;
    const config = this.retention.config();
    if (config.kind === 'invalid') {
      logError(`Retention disabled: ${config.reason}`);
      return;
    }
    if (config.kind === 'disabled') {
      logInfo('Retention routine off (RETENTION_MONTHS not set)');
      return;
    }
    this.registrar.register('trip-retention', '10 4 * * *', () => this.tick());
    logInfo(`Retention scheduled: trips erased ${config.months} month(s) after their end date${config.dryRun ? ' (dry run: nothing is erased)' : ''}`);
  }

  async tick(): Promise<void> {
    const config = this.retention.config();
    if (config.kind !== 'enabled') return;
    try {
      const r = await this.retention.sweep(config.months, config.dryRun);
      if (r.found > 0) {
        logInfo(`Retention: ${r.found} expired (before ${r.cutoff}), ${r.deleted} erased, ${r.failed} failed${r.dryRun ? ', dry run' : ''}`);
      }
    } catch (err: unknown) {
      logError(`Retention: ${err instanceof Error ? err.message : err}`);
    }
  }
}
