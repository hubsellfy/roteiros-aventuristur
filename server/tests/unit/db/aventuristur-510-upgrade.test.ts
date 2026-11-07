import { createMigrationOrm, migratorOf, pendingNames, rawQuery } from '../../helpers/migration-step';

import { describe, expect, it } from 'vitest';

const UPSTREAM = 'Migration20200101046320_a_place_knows_where_its_details_came_from';
const AVENTURISTUR = 'Migration20260101000200_aventuristur_trip_ai_columns';

describe('Aventuristur upgrade to TREK 5.1.0', () => {
  it('preserves fork columns while applying the upstream migration', async () => {
    const orm = await createMigrationOrm();
    try {
      const migrator = migratorOf(orm);
      const names = await pendingNames(orm);
      expect(names).toContain(UPSTREAM);
      expect(names).toContain(AVENTURISTUR);
      await migrator.up({ migrations: names.filter((name) => name !== UPSTREAM) });
      expect(await pendingNames(orm)).toEqual([UPSTREAM]);
      const before = await rawQuery<{ name: string }>(orm, 'PRAGMA table_info(trips)');
      expect(before.map((column) => column.name)).toEqual(expect.arrayContaining(['ai_status', 'ai_request']));
      await migrator.up();
      await migrator.up();
      expect(await pendingNames(orm)).toEqual([]);
      expect(await rawQuery(orm, 'PRAGMA table_info(trips)')).toEqual(before);
      const tables = await rawQuery<{ name: string }>(orm, "SELECT name FROM sqlite_master WHERE type = 'table'");
      expect(tables.map((table) => table.name)).toEqual(
        expect.arrayContaining(['place_field_origin', 'place_contrib_outbox', 'place_contrib_log']),
      );
    } finally {
      await orm.close(true);
    }
  }, 60_000);
});
