import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Trips } from '../../db/entities/Trips.entity';
import { MapsModule } from '../maps/maps.module';
import { DaysModule } from '../days/days.module';
import { TripsModule } from '../trips/trips.module';
import { LlmParseModule } from '../llm-parse/llm-parse.module';
import { PlacesModule } from '../places/places.module';
import { AssignmentsDomainModule } from '../assignments/assignments-domain.module';
import { RoteiroIaController } from './roteiro-ia.controller';
import { RoteiroChatService } from './roteiro-chat.service';
import { RoteiroTripService } from './roteiro-trip.service';

/**
 * Aventuristur: the "Pergunte" travel assistant on the map and the AI itinerary builder behind
 * "Para onde vamos?". Separate from the TREK assistant (`nest/assistant`), which has its own routes.
 */
@Module({
  imports: [MikroOrmModule.forFeature([Trips]), MapsModule, DaysModule, TripsModule, LlmParseModule, PlacesModule, AssignmentsDomainModule],
  controllers: [RoteiroIaController],
  providers: [RoteiroChatService, RoteiroTripService],
})
export class RoteiroIaModule {}
