import { useEffect, useRef } from 'react';

export const useProctoring = (socket, sessionId) => {
  const blurTimeRef = useRef(null);

  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switched / hidden
        blurTimeRef.current = Date.now();
        socket.emit('proctor:violation', {
          sessionId,
          eventType: 'tab_switch',
          clientTimestamp: new Date().toISOString(),
        });
      } else {
        // Tab visible again
        const absenceDurationMs = blurTimeRef.current
          ? Date.now() - blurTimeRef.current
          : 0;
        blurTimeRef.current = null;
        socket.emit('proctor:violation', {
          sessionId,
          eventType: 'focus_regain',
          clientTimestamp: new Date().toISOString(),
          absenceDurationMs,
        });
      }
    };

    const handleBlur = () => {
      blurTimeRef.current = Date.now();
      socket.emit('proctor:violation', {
        sessionId,
        eventType: 'focus_loss',
        clientTimestamp: new Date().toISOString(),
      });
    };

    const handleFocus = () => {
      const absenceDurationMs = blurTimeRef.current
        ? Date.now() - blurTimeRef.current
        : 0;
      blurTimeRef.current = null;
      socket.emit('proctor:violation', {
        sessionId,
        eventType: 'focus_regain',
        clientTimestamp: new Date().toISOString(),
        absenceDurationMs,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [socket, sessionId]);
};
