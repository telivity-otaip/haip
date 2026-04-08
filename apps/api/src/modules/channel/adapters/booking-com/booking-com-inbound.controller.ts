import {
  Controller,
  Post,
  Req,
  Res,
  Logger,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../../auth/public.decorator';
import { InboundReservationService } from '../../inbound-reservation.service';
import { ChannelService } from '../../channel.service';
import { parseOtaXml, buildOtaXml } from './booking-com.xml';
import {
  mapOtaReservationToHaip,
  buildReservationConfirmation,
} from './booking-com.mapper';

/**
 * Inbound webhook receiver for Booking.com push notifications.
 * Booking.com pushes reservation notifications as OTA XML to this endpoint.
 *
 * @Public() — no JWT required (Booking.com can't authenticate to our IdP).
 * Security is via Basic Auth verification in the request.
 */
@ApiTags('Channel Manager — Booking.com')
@Controller('channels/inbound/booking-com')
@Public()
export class BookingComInboundController {
  private readonly logger = new Logger(BookingComInboundController.name);

  constructor(
    private readonly inboundReservationService: InboundReservationService,
    private readonly channelService: ChannelService,
  ) {}

  /**
   * Receive reservation push from Booking.com (OTA_HotelResNotif).
   * Returns OTA_HotelResRS confirmation XML.
   */
  @Post('reservations')
  @ApiOperation({ summary: 'Receive inbound reservation from Booking.com (XML)' })
  @ApiExcludeEndpoint()
  async receiveReservation(
    @Req() req: any,
    @Res() res: any,
    @Headers('authorization') authHeader?: string,
  ) {
    try {
      // Read raw XML body
      const rawBody = await this.readRawBody(req);

      if (!rawBody) {
        return this.sendErrorXml(res, '400', 'Empty request body');
      }

      // Parse the inbound XML
      const parsed = parseOtaXml(rawBody);

      if (!parsed.success && parsed.errors.length > 0) {
        this.logger.warn(`Invalid XML from Booking.com: ${parsed.errors.map((e) => e.message).join(', ')}`);
        return this.sendErrorXml(res, '400', 'Invalid XML payload');
      }

      // Map OTA reservation to HAIP format
      const reservations = mapOtaReservationToHaip(parsed.data);

      if (reservations.length === 0) {
        this.logger.warn('Booking.com push contained no reservations');
        return this.sendErrorXml(res, '400', 'No reservations in payload');
      }

      // Find channel connection for booking_com
      const connection = await this.findBookingComConnection();

      if (!connection) {
        this.logger.error('No active Booking.com channel connection found');
        return this.sendErrorXml(res, '500', 'No active Booking.com connection configured');
      }

      // Process each reservation
      const results = [];
      for (const reservation of reservations) {
        try {
          const result = await this.inboundReservationService.processInboundReservation(
            connection.id,
            reservation,
          );
          results.push({
            externalConfirmation: reservation.externalConfirmation,
            pmsConfirmation: result.confirmationNumber,
            success: true,
          });
        } catch (error: any) {
          this.logger.error(
            `Failed to process Booking.com reservation ${reservation.externalConfirmation}: ${error.message}`,
          );
          results.push({
            externalConfirmation: reservation.externalConfirmation,
            error: error.message,
            success: false,
          });
        }
      }

      // Build confirmation response
      const firstSuccess = results.find((r) => r.success);
      if (firstSuccess) {
        const confirmationPayload = buildReservationConfirmation(
          firstSuccess.externalConfirmation,
          firstSuccess.pmsConfirmation!,
        );
        const responseXml = buildOtaXml('OTA_HotelResRS', confirmationPayload);
        res.set('Content-Type', 'application/xml');
        return res.status(200).send(responseXml);
      }

      return this.sendErrorXml(res, '500', 'Failed to process all reservations');
    } catch (error: any) {
      this.logger.error(`Booking.com inbound error: ${error.message}`, error.stack);
      return this.sendErrorXml(res, '500', 'Internal processing error');
    }
  }

  /**
   * Receive cancellation from Booking.com (OTA_CancelRQ).
   * Returns OTA_CancelRS confirmation XML.
   */
  @Post('cancellations')
  @ApiOperation({ summary: 'Receive cancellation from Booking.com (XML)' })
  @ApiExcludeEndpoint()
  async receiveCancellation(
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      const rawBody = await this.readRawBody(req);

      if (!rawBody) {
        return this.sendErrorXml(res, '400', 'Empty request body');
      }

      const parsed = parseOtaXml(rawBody);

      // Extract reservation ID from cancellation request
      const uniqueId = (parsed.data as any).UniqueID;
      const externalConfirmation = uniqueId?.['@_ID']
        ? String(uniqueId['@_ID'])
        : undefined;

      if (!externalConfirmation) {
        return this.sendErrorXml(res, '400', 'Missing reservation ID in cancellation');
      }

      // Build a cancellation ChannelReservation
      const connection = await this.findBookingComConnection();
      if (!connection) {
        return this.sendErrorXml(res, '500', 'No active Booking.com connection configured');
      }

      // Process as cancellation through the standard flow
      await this.inboundReservationService.processInboundReservation(
        connection.id,
        {
          externalConfirmation,
          channelCode: 'booking_com',
          guestFirstName: '',
          guestLastName: '',
          channelRoomCode: '',
          channelRateCode: '',
          arrivalDate: '',
          departureDate: '',
          adults: 0,
          children: 0,
          totalAmount: 0,
          currencyCode: 'USD',
          status: 'cancelled',
          channelBookingDate: new Date(),
        },
      );

      // Return success
      const responseXml = buildOtaXml('OTA_CancelRS', {
        '@_Status': 'Cancelled',
        Success: '',
        UniqueID: {
          '@_Type': '14',
          '@_ID': externalConfirmation,
        },
      });

      res.set('Content-Type', 'application/xml');
      return res.status(200).send(responseXml);
    } catch (error: any) {
      this.logger.error(`Booking.com cancellation error: ${error.message}`, error.stack);
      return this.sendErrorXml(res, '500', error.message);
    }
  }

  // --- Private ---

  private async findBookingComConnection() {
    // Find first active Booking.com connection
    const connections = await this.channelService.findByAdapterType('booking_com');
    return connections[0] ?? null;
  }

  private sendErrorXml(res: any, code: string, message: string) {
    const xml = buildOtaXml('OTA_ErrorRS', {
      Errors: {
        Error: { '@_Code': code, '@_ShortText': message },
      },
    });
    res.set('Content-Type', 'application/xml');
    return res.status(code === '400' ? 400 : 500).send(xml);
  }

  private readRawBody(req: any): Promise<string> {
    return new Promise((resolve) => {
      // If body is already parsed (e.g., raw body middleware), use it
      if (req.rawBody) {
        resolve(typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString());
        return;
      }
      if (typeof req.body === 'string') {
        resolve(req.body);
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
  }
}
