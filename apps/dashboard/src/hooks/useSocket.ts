import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return { connected };
}
