import { useState, useEffect } from 'react';

export const useTestTimer = (hardEndAt, onExpire) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!hardEndAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(hardEndAt) - new Date();
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const intervalId = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [hardEndAt, onExpire]);

  const formatTime = () => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    return [
      hours > 0 ? String(hours).padStart(2, '0') : null,
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':');
  };

  return {
    timeLeft,
    formattedTime: formatTime(),
    isLowTime: timeLeft > 0 && timeLeft < 300, // less than 5 minutes
    isCriticalTime: timeLeft > 0 && timeLeft < 60, // less than 1 minute
  };
};
