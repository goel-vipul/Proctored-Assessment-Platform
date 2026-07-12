import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = (url, token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const wsUrl = url || import.meta.env.VITE_WS_URL || '';
    socketRef.current = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url, token]);

  return socketRef.current;
};
