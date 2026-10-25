import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { AssistantChatResponse } from '@trek/shared';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './assistant.dto';

/** /api/assistant — the travel assistant behind the map's "Pergunte" pill. */
@Controller('api/assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  @HttpCode(200)
  chat(@CurrentUser() user: User, @Body() body: AssistantChatDto): Promise<AssistantChatResponse> {
    return this.assistant.chat(user.id, body);
  }
}
