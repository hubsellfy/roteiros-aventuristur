import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Trips } from '../../db/entities/Trips.entity';
import { AuditModule } from '../audit/audit.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { StorageModule } from '../storage/storage.module';
import { TripsModule } from '../trips/trips.module';
import { RetentionJob } from './retention.job';
import { RetentionService } from './retention.service';

@Module({
  imports: [MikroOrmModule.forFeature([Trips]), AuditModule, SchedulingModule, StorageModule, TripsModule],
  providers: [RetentionService, RetentionJob],
})
export class RetentionModule {}
