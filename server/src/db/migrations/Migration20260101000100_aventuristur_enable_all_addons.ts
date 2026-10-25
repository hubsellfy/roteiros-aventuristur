import { Migration } from '@mikro-orm/migrations';

/**
 * Aventuristur: todos os recursos do TREK ligados por padrão (addons, provedores de
 * fotos, provedores de documentos e controle de bagagem). Roda uma vez; depois disso o
 * administrador decide em Admin > Addons.
 *
 * Instalações que já passaram por este passo no executor antigo (as da Aventuristur em
 * produção) entram com ele marcado como executado: `legacy-baseline.ts` registra o nome
 * ao mapear o `schema_version` antigo.
 */
export class Migration20260101000100_aventuristur_enable_all_addons extends Migration {
  override name = 'Migration20260101000100_aventuristur_enable_all_addons';

  override up(): void {
    this.addSql('UPDATE addons SET enabled = 1');
    this.addSql('UPDATE photo_providers SET enabled = 1');
    this.addSql('UPDATE document_providers SET enabled = 1');
    this.addSql("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('bag_tracking_enabled', 'true')");
  }
}
