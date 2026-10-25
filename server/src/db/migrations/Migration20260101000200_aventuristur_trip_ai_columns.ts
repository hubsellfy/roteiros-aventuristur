import { addColumnIfMissing } from '../migration-utils';
import { Migration } from '@mikro-orm/migrations';

/**
 * Aventuristur: criador de roteiro com IA. `ai_status` marca a viagem enquanto o roteiro é
 * montado em segundo plano ('generating') ou quando a montagem falhou ('failed'); NULL é
 * uma viagem comum. `ai_request` guarda o pedido do cliente para "Tentar de novo".
 */
export class Migration20260101000200_aventuristur_trip_ai_columns extends Migration {
  override name = 'Migration20260101000200_aventuristur_trip_ai_columns';

  override async up(): Promise<void> {
    await addColumnIfMissing(this, 'trips', 'ai_status', 'ai_status TEXT');
    await addColumnIfMissing(this, 'trips', 'ai_request', 'ai_request TEXT');
  }
}
