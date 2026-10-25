import { readEnv } from '../../app-config';
import { Trips } from '../../db/entities/Trips.entity';
import type { TripsRepository, ExpiredTripRow } from '../../db/repositories/Trips.repository';
import { logError, logInfo } from '../audit/audit-log.logger';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { TripsService } from '../trips/trips.service';
import { parseRetentionConfig, retentionCutoff, type RetentionConfig } from './retention.impl';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';

import path from 'path';

export interface RetentionResult {
  cutoff: string;
  dryRun: boolean;
  found: number;
  deleted: number;
  failed: number;
}

/**
 * Erases trips (and the stored files that belong to them) a fixed number of months after
 * their end date. The stock trip delete only drops database rows, so the bytes in the
 * "files", "photos" and "covers" storage would stay behind: this service removes them
 * first and drops the trip only when every file is gone, so a failure is retried on the
 * next run instead of leaving documents without a database pointer.
 */
@Injectable()
export class RetentionService {
  constructor(
    @InjectRepository(Trips) private readonly tripsRepo: TripsRepository,
    private readonly storage: StorageService,
    private readonly trips: TripsService,
    private readonly audit: AuditService,
  ) {}

  config(): RetentionConfig {
    const { months, dryRun } = readEnv().retention;
    return parseRetentionConfig({ RETENTION_MONTHS: months, RETENTION_DRY_RUN: dryRun });
  }

  async sweep(months: number, dryRun: boolean, now: Date = new Date()): Promise<RetentionResult> {
    const cutoff = retentionCutoff(now, months);
    const expired = await this.tripsRepo.listEndedBefore(cutoff);
    const result: RetentionResult = { cutoff, dryRun, found: expired.length, deleted: 0, failed: 0 };

    for (const trip of expired) {
      if (dryRun) {
        logInfo(`Retention (dry run): trip #${trip.id} ended ${trip.end_date} would be erased`);
        continue;
      }
      try {
        await this.eraseTrip(trip, months);
        result.deleted++;
      } catch (err: unknown) {
        result.failed++;
        logError(`Retention: trip #${trip.id} kept for the next run: ${err instanceof Error ? err.message : err}`);
      }
    }
    return result;
  }

  private async eraseTrip(trip: ExpiredTripRow, months: number): Promise<void> {
    const { files, photos } = await this.tripsRepo.listStoredFileNames(trip.id);

    // storage.delete is idempotent for a missing object; any other failure throws and
    // aborts before the trip row is touched.
    for (const f of files) await this.storage.delete('files', path.basename(f));
    for (const p of photos) await this.storage.delete('photos', path.basename(p));
    if (trip.cover_image) await this.storage.delete('covers', path.basename(trip.cover_image));

    // userId 0 never matches an owner, so this is recorded as an administrative delete.
    await this.trips.remove(trip.id, 0, 'admin');
    await this.audit.writeAudit({
      userId: null,
      action: 'trip.retention_delete',
      details: {
        tripId: trip.id,
        endDate: trip.end_date,
        retentionMonths: months,
        files: files.length + photos.length,
      },
    });
    this.trips.broadcast(String(trip.id), 'trip:deleted', { id: trip.id }, undefined);
    logInfo(`Retention: trip #${trip.id} (ended ${trip.end_date}) erased with ${files.length + photos.length} file(s)`);
  }
}
