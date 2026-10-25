import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module';
import { DaysModule } from '../days/days.module';
import { TripsModule } from '../trips/trips.module';
import { DatabaseModule } from '../database/database.module';
import { LlmParseModule } from '../llm-parse/llm-parse.module';
import { AssistantController } from './assistant.controller';
import { PlacesModule } from '../places/places.module';
import { AssignmentsDomainModule } from '../assignments/assignments-domain.module';
import { AssistantService } from './assistant.service';
import { AssistantTripService } from './assistant-trip.service';

/** Travel assistant (chat with tools over Google places and the trip) and the AI itinerary builder. Registered in AppModule. */
@Module({
  imports: [MapsModule, DaysModule, TripsModule, DatabaseModule, LlmParseModule, PlacesModule, AssignmentsDomainModule],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantTripService],
})
export class AssistantModule {}
