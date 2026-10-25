import { roteiroChatRequestSchema, roteiroTripPlanRequestSchema } from '@trek/shared';

import { createZodDto } from 'nestjs-zod';

/** Validated by the global ZodValidationPipe; the schema in shared/ is the contract. */
export class RoteiroChatDto extends createZodDto(roteiroChatRequestSchema) {}

export class RoteiroTripPlanDto extends createZodDto(roteiroTripPlanRequestSchema) {}
