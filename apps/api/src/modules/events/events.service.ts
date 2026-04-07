import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsGateway } from './events.gateway';

interface PmsEvent {
  event: string;
  propertyId?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  @OnEvent('**')
  handleAllEvents(payload: PmsEvent) {
    if (!payload?.propertyId) return;
    this.gateway.broadcastToProperty(
      payload.propertyId,
      payload.event ?? 'unknown',
      payload.data ?? payload,
    );
  }
}
