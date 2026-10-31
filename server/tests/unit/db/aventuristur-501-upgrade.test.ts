import { createMigrationOrm, migratorOf, pendingNames, rawQuery } from '../../helpers/migration-step';

import { describe, expect, it } from 'vitest';

const UPSTREAM = 'Migration20200101046310_an_admin_can_run_a_plugin_outside_its_trek_range';
const AVENTURISTUR = 'Migration20260101000200_aventuristur_trip_ai_columns';

describe('Aventuristur upgrade to TREK 5.0.1', () => {
  it('applies the newly introduced older migration after existing Aventuristur migrations', async () => {
    const orm = await createMigrationOrm();
    try {
      const migrator = migratorOf(orm);
      const names = await pendingNames(orm);
      expect(names).toContain(UPSTREAM);
      expect(names).toContain(AVENTURISTUR);

      // Reproduce the previously deployed schema: every old migration is already
      // recorded, including our newer-numbered migrations, except the 5.0.1 step.
      await migrator.up({ migrations: names.filter((name) => name !== UPSTREAM) });
      expect(await pendingNames(orm)).toEqual([UPSTREAM]);
      const tripColumnsBefore = await rawQuery<{ name: string }>(orm, 'PRAGMA table_info(trips)');
      expect(tripColumnsBefore.map((column) => column.name)).toEqual(
        expect.arrayContaining(['ai_status', 'ai_request']),
      );

      await migrator.up();
      await migrator.up();

      expect(await pendingNames(orm)).toEqual([]);
      const pluginColumns = await rawQuery<{ name: string }>(orm, 'PRAGMA table_info(plugins)');
      expect(pluginColumns.map((column) => column.name)).toEqual(
        expect.arrayContaining(['trek_range_accepted_version', 'trek_range_accepted_host']),
      );
      const tripColumnsAfter = await rawQuery<{ name: string }>(orm, 'PRAGMA table_info(trips)');
      expect(tripColumnsAfter).toEqual(tripColumnsBefore);
    } finally {
      await orm.close(true);
    }
  }, 60_000);
});
