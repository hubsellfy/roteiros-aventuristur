import { Trips } from '../../db/entities/Trips.entity';
import { TripsAventuristurRepository } from '../../db/repositories/TripsAventuristur.repository';
import { AiConnectionsModule } from '../ai-connections/ai-connections.module';
import { AssignmentsDomainModule } from '../assignments/assignments-domain.module';
import { DaysModule } from '../days/days.module';
import { LlmParseModule } from '../llm-parse/llm-parse.module';
import { MapsModule } from '../maps/maps.module';
import { PlacesModule } from '../places/places.module';
import { TripsModule } from '../trips/trips.module';
import { RoteiroChatService } from './roteiro-chat.service';
import { RoteiroIaController } from './roteiro-ia.controller';
import { RoteiroTripService } from './roteiro-trip.service';
import { EntityManager } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

/**
 * Aventuristur: the "Pergunte" travel assistant on the map and the AI itinerary builder behind
 * "Para onde vamos?". Separate from the TREK assistant (`nest/assistant`), which has its own routes.
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([Trips]),
    AiConnectionsModule,
    MapsModule,
    DaysModule,
    TripsModule,
    LlmParseModule,
    PlacesModule,
    AssignmentsDomainModule,
  ],
  controllers: [RoteiroIaController],
  providers: [
    RoteiroChatService,
    RoteiroTripService,
    {
      provide: TripsAventuristurRepository,
      useFactory: (em: EntityManager) => new TripsAventuristurRepository(em),
      inject: [EntityManager],
    },
  ],
})
export class RoteiroIaModule {}
