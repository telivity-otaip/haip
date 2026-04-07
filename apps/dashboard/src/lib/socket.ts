import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function joinPropertyRoom(propertyId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('joinProperty', { propertyId });
}

export function leavePropertyRoom(propertyId: string) {
  const s = getSocket();
  s.emit('leaveProperty', { propertyId });
}
