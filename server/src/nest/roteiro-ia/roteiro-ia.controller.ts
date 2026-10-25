import { Body, Controller, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import type { RoteiroChatResponse, RoteiroTripPlanResponse } from '@trek/shared';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth-core/jwt-auth.guard';
import { CurrentUser } from '../auth-core/current-user.decorator';
import { RoteiroChatService } from './roteiro-chat.service';
import { RoteiroTripService } from './roteiro-trip.service';
import { RoteiroChatDto, RoteiroTripPlanDto } from './roteiro-ia.dto';

/** /api/roteiro-ia — the travel assistant behind the map's "Pergunte" pill. */
@Controller('api/roteiro-ia')
@UseGuards(JwtAuthGuard)
export class RoteiroIaController {
  constructor(private readonly assistant: RoteiroChatService, private readonly tripPlans: RoteiroTripService) {}

  @Post('chat')
  @HttpCode(200)
  chat(@CurrentUser() user: User, @Body() body: RoteiroChatDto): Promise<RoteiroChatResponse> {
    return this.assistant.chat(user.id, body);
  }

  /** Creates the trip card at once and builds the itinerary in the background (202). */
  @Post('trip-plan')
  @HttpCode(202)
  createTripPlan(@CurrentUser() user: User, @Body() body: RoteiroTripPlanDto): Promise<RoteiroTripPlanResponse> {
    return this.tripPlans.start(user, body);
  }

  @Post('trip-plan/:tripId/retry')
  @HttpCode(202)
  retryTripPlan(@CurrentUser() user: User, @Param('tripId', ParseIntPipe) tripId: number): Promise<RoteiroTripPlanResponse> {
    return this.tripPlans.retry(user.id, tripId);
  }
}
