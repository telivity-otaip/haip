import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRateRestrictionDto } from './create-rate-restriction.dto';

export class UpdateRateRestrictionDto extends PartialType(
  OmitType(CreateRateRestrictionDto, ['propertyId'] as const),
) {}
