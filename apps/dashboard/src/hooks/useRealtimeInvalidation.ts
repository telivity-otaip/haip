import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';

const EVENT_KEY_MAP: Record<string, string[][]> = {
  'reservation.': [['reservations'], ['rooms'], ['reports']],
  'room.': [['rooms'], ['housekeeping']],
  'housekeeping.': [['housekeeping'], ['rooms']],
  'folio.': [['folios'], ['payments']],
  'payment.': [['payments'], ['folios']],
  'audit.': [['audit'], ['reports']],
  'channel.': [['channels']],
  'agent.': [['agents'], ['agent-decisions'], ['agent-performance']],
  'guest.': [['agent-decisions'], ['reviews']],
  'connect.': [['connect']],
};

export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    function handleEvent(payload: { event: string }) {
      if (!payload?.event) return;

      for (const [prefix, keys] of Object.entries(EVENT_KEY_MAP)) {
        if (payload.event.startsWith(prefix)) {
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      }
    }

    socket.on('pmsEvent', handleEvent);
    return () => {
      socket.off('pmsEvent', handleEvent);
    };
  }, [queryClient]);
}
