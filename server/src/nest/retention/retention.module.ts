import { Trips } from '../../db/entities/Trips.entity';
import { TripsAventuristurRepository } from '../../db/repositories/TripsAventuristur.repository';
import { AuditModule } from '../audit/audit.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { StorageModule } from '../storage/storage.module';
import { TripsModule } from '../trips/trips.module';
import { RetentionJob } from './retention.job';
import { RetentionService } from './retention.service';
import { EntityManager } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

@Module({
  imports: [MikroOrmModule.forFeature([Trips]), AuditModule, SchedulingModule, StorageModule, TripsModule],
  providers: [
    RetentionService,
    RetentionJob,
    {
      provide: TripsAventuristurRepository,
      useFactory: (em: EntityManager) => new TripsAventuristurRepository(em),
      inject: [EntityManager],
    },
  ],
})
export class RetentionModule {}
