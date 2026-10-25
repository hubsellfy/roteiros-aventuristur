import { Body, Controller, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import type { AssistantChatResponse, AssistantTripPlanResponse } from '@trek/shared';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AssistantService } from './assistant.service';
import { AssistantTripService } from './assistant-trip.service';
import { AssistantChatDto, AssistantTripPlanDto } from './assistant.dto';

/** /api/assistant — the travel assistant behind the map's "Pergunte" pill. */
@Controller('api/assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService, private readonly tripPlans: AssistantTripService) {}

  @Post('chat')
  @HttpCode(200)
  chat(@CurrentUser() user: User, @Body() body: AssistantChatDto): Promise<AssistantChatResponse> {
    return this.assistant.chat(user.id, body);
  }

  /** Creates the trip card at once and builds the itinerary in the background (202). */
  @Post('trip-plan')
  @HttpCode(202)
  createTripPlan(@CurrentUser() user: User, @Body() body: AssistantTripPlanDto): AssistantTripPlanResponse {
    return this.tripPlans.start(user, body);
  }

  @Post('trip-plan/:tripId/retry')
  @HttpCode(202)
  retryTripPlan(@CurrentUser() user: User, @Param('tripId', ParseIntPipe) tripId: number): AssistantTripPlanResponse {
    return this.tripPlans.retry(user.id, tripId);
  }
}
