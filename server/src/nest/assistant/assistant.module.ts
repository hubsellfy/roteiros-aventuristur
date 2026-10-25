import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module';
import { DaysModule } from '../days/days.module';
import { TripsModule } from '../trips/trips.module';
import { DatabaseModule } from '../database/database.module';
import { LlmParseModule } from '../llm-parse/llm-parse.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

/** Travel assistant (chat with tools over Google places and the trip). Registered in AppModule. */
@Module({
  imports: [MapsModule, DaysModule, TripsModule, DatabaseModule, LlmParseModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
