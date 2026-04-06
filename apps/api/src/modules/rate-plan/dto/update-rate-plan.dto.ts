import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRatePlanDto } from './create-rate-plan.dto';

export class UpdateRatePlanDto extends PartialType(
  OmitType(CreateRatePlanDto, ['propertyId', 'roomTypeId'] as const),
) {}
