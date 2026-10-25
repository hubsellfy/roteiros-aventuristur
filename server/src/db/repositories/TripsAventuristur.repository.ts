import { currentTimestamp } from '../dialect/sql-functions';
import { Trips } from '../entities/Trips.entity';
import type { DB } from '../kysely/db';
import { TrekRepository } from './_shared/trek-repository';
import type { EntityManager } from '@mikro-orm/core';
import type { SqlEntityManager } from '@mikro-orm/sql';

/**
 * Aventuristur: the AI itinerary builder state (`ai_status`/`ai_request`) and the LGPD retention
 * sweep, on the same `trips` table as `TripsRepository`. Kept in a file of their own so the
 * upstream repository stays identical to TREK's and a merge of upstream stays easy to read.
 */
export class TripsAventuristurRepository extends TrekRepository<Trips> {
  /** Built over the context-resolving EntityManager, like the repositories MikroORM hands out per entity. */
  constructor(em: EntityManager) {
    super(em as SqlEntityManager, Trips);
  }

  /** The builder's state for one trip: who owns it, where it stands and the saved request. */
  async findAiState(id: number): Promise<TripAiStateRow | undefined> {
    return await this.kysely<Pick<DB, 'trips'>>()
      .selectFrom('trips')
      .select(['user_id', 'ai_status', 'ai_request'])
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /** Whether this traveller already has an itinerary being built. */
  async hasGenerating(user_id: number): Promise<boolean> {
    const row = await this.kysely<Pick<DB, 'trips'>>()
      .selectFrom('trips')
      .select('id')
      .where('user_id', '=', user_id)
      .where('ai_status', '=', 'generating')
      .executeTakeFirst();
    return row !== undefined;
  }

  /** Marks the builder's state; `request` is only written when given. */
  async setAiState(id: number, ai_status: 'generating' | 'failed' | null, request?: string): Promise<void> {
    const platform = this.getEntityManager().getPlatform();
    await this.nativeUpdate(
      { id },
      request === undefined
        ? { ai_status, updated_at: currentTimestamp(platform) }
        : { ai_status, ai_request: request, updated_at: currentTimestamp(platform) },
    );
  }

  /** A restart kills the background work, so every trip still "generating" is marked failed. */
  async failAllGenerating(): Promise<void> {
    await this.nativeUpdate({ ai_status: 'generating' }, { ai_status: 'failed' });
  }

  async setTitle(id: number, title: string): Promise<void> {
    const platform = this.getEntityManager().getPlatform();
    await this.nativeUpdate({ id }, { title, updated_at: currentTimestamp(platform) });
  }

  /** Retention: trips whose end date is strictly before `cutoff` (YYYY-MM-DD), oldest first. */
  async listEndedBefore(cutoff: string): Promise<ExpiredTripRow[]> {
    return (await this.kysely<Pick<DB, 'trips'>>()
      .selectFrom('trips')
      .select(['id', 'title', 'end_date', 'cover_image'])
      .where('end_date', 'is not', null)
      .where('end_date', '<>', '')
      .where('end_date', '<', cutoff)
      .orderBy('end_date')
      .execute()) as ExpiredTripRow[];
  }

  /** Retention: the stored file names (documents and photos) that belong to one trip. */
  async listStoredFileNames(trip_id: number): Promise<{ files: string[]; photos: string[] }> {
    const db = this.kysely<Pick<DB, 'trip_files' | 'photos'>>();
    const files = await db.selectFrom('trip_files').select('filename').where('trip_id', '=', trip_id).execute();
    const photos = await db.selectFrom('photos').select('filename').where('trip_id', '=', trip_id).execute();
    return { files: files.map((f) => f.filename), photos: photos.map((p) => p.filename) };
  }
}

/** {@link TripsAventuristurRepository.findAiState}'s projection. */
export interface TripAiStateRow {
  user_id: number;
  ai_status: string | null;
  ai_request: string | null;
}

/** {@link TripsAventuristurRepository.listEndedBefore}'s projection. */
export interface ExpiredTripRow {
  id: number;
  title: string;
  end_date: string;
  cover_image: string | null;
}
