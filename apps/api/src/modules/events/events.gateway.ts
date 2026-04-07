import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinProperty')
  handleJoinProperty(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { propertyId: string },
  ) {
    if (!data?.propertyId) return;
    const room = `property:${data.propertyId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('leaveProperty')
  handleLeaveProperty(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { propertyId: string },
  ) {
    if (!data?.propertyId) return;
    const room = `property:${data.propertyId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
  }

  broadcastToProperty(propertyId: string, event: string, data: unknown) {
    const room = `property:${propertyId}`;
    this.server.to(room).emit('pmsEvent', {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
