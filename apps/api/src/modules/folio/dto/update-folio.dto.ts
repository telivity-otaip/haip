import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFolioDto } from './create-folio.dto';

export class UpdateFolioDto extends PartialType(
  OmitType(CreateFolioDto, ['propertyId', 'guestId', 'reservationId', 'bookingId', 'type'] as const),
) {}
