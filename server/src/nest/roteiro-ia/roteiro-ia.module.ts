import { Trips } from '../../db/entities/Trips.entity';
import { AssignmentsDomainModule } from '../assignments/assignments-domain.module';
import { DaysModule } from '../days/days.module';
import { LlmParseModule } from '../llm-parse/llm-parse.module';
import { MapsModule } from '../maps/maps.module';
import { PlacesModule } from '../places/places.module';
import { TripsModule } from '../trips/trips.module';
import { RoteiroChatService } from './roteiro-chat.service';
import { RoteiroIaController } from './roteiro-ia.controller';
import { RoteiroTripService } from './roteiro-trip.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

/**
 * Aventuristur: the "Pergunte" travel assistant on the map and the AI itinerary builder behind
 * "Para onde vamos?". Separate from the TREK assistant (`nest/assistant`), which has its own routes.
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([Trips]),
    MapsModule,
    DaysModule,
    TripsModule,
    LlmParseModule,
    PlacesModule,
    AssignmentsDomainModule,
  ],
  controllers: [RoteiroIaController],
  providers: [RoteiroChatService, RoteiroTripService],
})
export class RoteiroIaModule {}
