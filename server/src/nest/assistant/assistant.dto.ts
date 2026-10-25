import { createZodDto } from 'nestjs-zod';
import { assistantChatRequestSchema } from '@trek/shared';

/** Validated by the global ZodValidationPipe; the schema in shared/ is the contract. */
export class AssistantChatDto extends createZodDto(assistantChatRequestSchema) {}
